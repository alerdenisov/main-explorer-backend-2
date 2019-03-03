import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransferEntityRepository } from 'entities/transfer.entity';
import {
  TransactionEntityRepository,
  TransactionEntity,
} from 'entities/transaction.entity';
import { DeepPartial, In } from 'typeorm';
import bn from 'bignumber.js';
import { Transaction } from 'web3/eth/types';
import { validate, validateOrReject } from 'class-validator';
import { BaseNetworkDemon } from './base-network.demon';
import Contract from 'web3/eth/contract';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import * as Bluebird from 'bluebird';
import { HolderEntityRepository, HolderEntity } from 'entities/holder.entity';
import { HexTransformer } from 'entities/hex.transformer';

const holders = (afterBlock: number) => `
SELECT holder.address as address, MAX(holder.height) as lastChangeBlock FROM (
  SELECT tr.from as address, MAX(tr.blockHeight) as height FROM transfer_entity tr WHERE tr.processedBalance = FALSE GROUP BY tr.from
    UNION
  SELECT tr.to as address, MAX(tr.blockHeight) as height FROM transfer_entity tr WHERE tr.processedBalance = FALSE GROUP BY tr.to
) AS holder
WHERE holder.height >= ${afterBlock}
GROUP BY holder.address;
`;
const outgoing = (address: string) => `
SELECT 
  HEX(tr.txHash) as tx, 
  tr.date as \`date\`, 
  tr.from as address, 
  tr.amount as outgoing, 
  '0' as incoming,
  tr.blockHeight as block
FROM transfer_entity AS tr 
WHERE 
  tr.from = BINARY(${address})
`;

const incoming = (address: string) => `
SELECT 
  HEX(tr.txHash) as tx, 
  tr.date as \`date\`, 
  tr.to as address, 
  '0' as outgoing, 
  tr.amount as incoming,
  tr.blockHeight as block
FROM transfer_entity AS tr 
WHERE
  tr.to = BINARY(${address})
`;

const changes = (address: string) => `
SELECT 
  h.tx as tx, 
  MAX(h.date) as date, 
  MAX(h.incoming) as incoming, 
  MAX(h.outgoing) as outgoing,
  MAX(h.block) as block
FROM (
	${incoming(address)}
		UNION
	${outgoing(address)}
) as h
GROUP BY h.tx;
`;

@Injectable()
export class BalancesDemon extends BaseNetworkDemon {
  constructor(
    logger: Logger,
    @Inject('web3factory')
    web3factory: () => {
      web3: Web3;
      provider: WebsocketProvider;
    },
    @InjectRepository(TransferEntityRepository)
    private readonly transferRepository: TransferEntityRepository,
    @InjectRepository(HolderEntityRepository)
    private readonly holdersRepository: HolderEntityRepository,
  ) {
    super(logger, web3factory);
  }

  async execute() {
    // return;
    const hex = new HexTransformer();

    if (!this.transferRepository || !this.holdersRepository) {
      await Bluebird.delay(200);
      return;
    }

    const holder = await this.holdersRepository.findOne({
      order: {
        lastBlock: 'DESC',
      },
    });

    const lastBlock = holder
      ? holder.lastBlock
      : process.env.HEAL_LOOKUP_DISTANCE;

    const holdersResult = await this.holdersRepository
      .query(holders(lastBlock - process.env.HEAL_LOOKUP_DISTANCE))
      .then(addresses =>
        addresses.map(({ address }: { address: Buffer }) => {
          let h = this.holdersRepository.create();
          h.address = hex.from(address);
          return h;
        }),
      );

    const [pending, total] = await this.holdersRepository.findAndCount({
      where: {
        dirty: true,
      },
      take: 100,
    });

    const holdersMap = pending.concat(holdersResult);
    if (holdersMap.length === 0) {
      return;
    }

    console.log(`Update holders (${holdersMap.length} of ${total} pendings)`);

    for (const holder of holdersMap) {
      const { address } = holder;
      const holderChanges: Array<{
        date: Date;
        address: Buffer;
        outgoing: string;
        incoming: string;
        block: number;
      }> = await this.holdersRepository.query(changes(address));

      const totalOut = holderChanges
        .filter(c => c.outgoing !== '0')
        .map(c => new bn(c.outgoing))
        .reduce((total, next) => total.plus(next), new bn(0));
      const totalIn = holderChanges
        .filter(c => c.incoming !== '0')
        .map(c => new bn(c.incoming))
        .reduce((total, next) => total.plus(next), new bn(0));
      const total = totalIn.minus(totalOut);

      holder.incoming = totalIn;
      holder.outgoing = totalOut;
      holder.lastBlock = holderChanges.reduce(
        (max, change) => Math.max(max, change.block),
        0,
      );
      holder.estimateBalance = parseFloat(
        total.div(new bn(10).pow(18)).toFixed(4),
      );
      holder.balance = total;
      holder.dirty = false;
    }

    console.log(`Save balance changes`);
    await this.holdersRepository.save(holdersMap);

    // console.log(`Holders count: ${holdersResult.length}`);
    // return;

    // const holdersEntities: {
    //   [address: string]: HolderEntity;
    // } = {};

    // for (let holder of holdersResult) {
    //   const address = hex.from(holder.address);
    //   const holderChanges: Array<{
    //     date: Date;
    //     address: Buffer;
    //     outgoing: string;
    //     incoming: string;
    //   }> = await this.holdersRepository.query(changes(address));

    //   let h = this.holdersRepository.create();
    //   h.address = address;
    //   h.balance = total;
    //   holdersEntities[address] = h;
    // }

    // await this.holdersRepository.save(Object.values(holdersEntities));
  }

  //     const [pending, total] = await this.transferRepository.findAndCount({
  //       where: {
  //         processedBalance: false,
  //       },
  //       take: 1000,
  //       order: {
  //         createAt: 'ASC',
  //       },
  //     });

  //     console.log(`Found ${total} pending balances`);

  //     const holders = Array.from(
  //       new Set(
  //         pending
  //           .map(transfer => transfer.from)
  //           .concat(pending.map(transfer => transfer.to)),
  //       ),
  //     ).map(address => {
  //       const holder = this.holdersRepository.create();
  //       holder.address = address;
  //       holder.dirty = true;
  //       return holder;
  //     });

  //     function outgoingQuery(from: string) {
  //       return `
  // SELECT
  //   SUM(
  //     CONVERT(
  //       SUBSTRING(tr.amount, 1, CHAR_LENGTH(tr.amount) - 12),
  //       SIGNED
  //     ) / -1e6
  //   ) as balance
  // FROM
  //   transfer_entity as tr
  // WHERE
  //   tr.from = BINARY(${from})
  // AND
  //   tr.to <> BINARY(${from})`;
  //     }

  //     function incomingQuery(from: string) {
  //       return `
  // SELECT
  //   SUM(
  //     CONVERT(
  //       SUBSTRING(tr.amount, 1, CHAR_LENGTH(tr.amount) - 12),
  //       SIGNED
  //     ) / 1e6
  //   ) as balance
  // FROM
  //   transfer_entity as tr
  // WHERE
  //   tr.from <> BINARY(${from})
  // AND
  //   tr.to = BINARY(${from})`;
  //     }

  //     await this.holdersRepository.save(holders);

  //     this.holdersRepository.query(`
  //     `);
  //     this.holdersRepository.find({
  //       where: {
  //         dirty: true,
  //       },
  //     });

  //     // await this.holdersRepository.save(Object.values(balances));
  //     await this.transferRepository.save(
  //       pending.map(p => ((p.processedBalance = true), p)),
  //     );
  //   }
}
