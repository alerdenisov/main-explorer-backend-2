import { Module, Logger, Injectable, Inject } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import {
  TransferEntityRepository,
  TransferEntity,
  TransferEntityArchive,
  TransferEntityArchiveRepository,
} from 'entities/transfer.entity';
import {
  TransactionEntity,
  TransactionEntityRepository,
  TransactionEntityArchive,
  TransactionEntityArchiveRepository,
} from 'entities/transaction.entity';
import { HolderEntity, HolderEntityRepository } from 'entities/holder.entity';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import erc20 = require('exporter/erc20.json');
import * as Bluebird from 'bluebird';
import Contract from 'web3/eth/contract';
import { plainToClass } from 'class-transformer';
import { HexTransformer } from 'entities/hex.transformer';
import { BatchRequest, Block } from 'web3/eth/types';
import { MoreThanOrEqual, In } from 'typeorm';
import BN from 'bignumber.js';
import { BaseNetworkDemon } from './base-network.demon';
import { PromisifyBatchRequest } from './promisify-request';

// Found lowest reorganized block
const LOWEST_FAIL = 7208021;

@Injectable()
export class HealerDemon extends BaseNetworkDemon {
  constructor(
    logger: Logger,
    @Inject('web3factory')
    web3factory: () => {
      web3: Web3;
      provider: WebsocketProvider;
    },
    @InjectRepository(TransactionEntityRepository)
    private readonly transactionRepository: TransactionEntityRepository,
    @InjectRepository(TransactionEntityArchiveRepository)
    private readonly transactionArchiveRepository: TransactionEntityArchiveRepository,
    @InjectRepository(TransferEntityRepository)
    private readonly transferRepository: TransferEntityRepository,
    @InjectRepository(TransferEntityArchiveRepository)
    private readonly transferArchiveRepository: TransferEntityArchiveRepository,
    @InjectRepository(HolderEntityRepository)
    private readonly holderRepository: HolderEntityRepository,
  ) {
    super(logger, web3factory);
  }

  async execute() {
    console.log(process.env.FORCE_HEAL_TO >= 0);
    const wipeFrom =
      process.env.FORCE_HEAL_TO >= 0
        ? process.env.FORCE_HEAL_TO
        : await this.runFound();
    if (wipeFrom >= 0) {
      console.log(
        `Force "heal" (wipe off) everything after block height is ${wipeFrom}`,
      );

      try {
        await this.heal(wipeFrom);
      } catch (e) {
        console.log(e.message);
        return true;
      }
      process.env.FORCE_HEAL_TO = -1;
    }
  }

  async heal(allAfterHeight: number) {
    const transformer = new HexTransformer();

    const count = await this.transferRepository.count({
      where: {
        blockHeight: MoreThanOrEqual(allAfterHeight),
      },
    });

    let left = count;
    console.log(
      `Start heal database up to ${allAfterHeight} (${left} left transfers)`,
    );

    while (left > 0) {
      const transfers = await this.transferRepository.find({
        where: {
          blockHeight: MoreThanOrEqual(allAfterHeight),
        },
        order: {
          blockHeight: 'DESC',
        },
        take: process.env.HEAL_BATCH_SIZE,
      });

      const deep = transfers[transfers.length - 1].blockHeight;
      console.log(
        `Heal ${
          process.env.HEAL_BATCH_SIZE
        } batch up to ${deep} height (${Math.round(
          ((count - left) / count) * 10000,
        ) / 100}%)`,
      );

      // TODO: Relation mapping!
      const transactions = await this.transactionRepository.find({
        where: {
          hash: In(transfers.map(t => t.txHash)),
        },
      });

      console.log(`${transfers.length} and ${transactions.length}`);

      if (left > 0) {
        const affectedHolders: string[] = await this.transferRepository
          .query(
            `
SELECT tbl.address FROM (
  SELECT tr.from as address 
  FROM transfer_entity tr
  WHERE tr.blockHeight >= ${deep}
    UNION 
  SELECT tr.to as address 
  FROM transfer_entity tr
  WHERE tr.blockHeight >= ${deep}
) as tbl
  `,
          )
          .then((results: any[]) =>
            results.map(
              (r, index) => (
                index === 0 ? console.log(r) : '', transformer.from(r.address)
              ),
            ),
          );

        console.log('Archivate transfers');
        await this.transferArchiveRepository.insert(transfers);
        console.log('Delete original transfers');
        await this.transferRepository.remove(transfers);

        console.log('Archivate transactions');
        await this.transactionArchiveRepository.insert(transactions);
        console.log('Delete original trasactions');
        await this.transactionRepository.remove(transactions);

        if (affectedHolders.length) {
          console.log(
            `Found ${
              affectedHolders.length
            } new affected holders.. so cure them`,
          );

          console.log('unprocess senders balances');
          await this.transferRepository.update(
            { from: In(affectedHolders) },
            { processedBalance: false },
          );
          console.log('unprocess receivers balances');
          await this.transferRepository.update(
            { to: In(affectedHolders) },
            { processedBalance: false },
          );

          console.log('unprocess balances');
          await this.holderRepository.save(
            affectedHolders.map(t => {
              const holder = this.holderRepository.create();
              holder.address = t;
              holder.dirty = true;
              return holder;
            }),
          );
        }
        console.log(
          `Healed ${transfers.length} transfers from ${
            transfers[0].blockHeight
          } to ${transfers[transfers.length - 1].blockHeight}`,
        );
      } else {
        console.log('everything is okay');
      }
      left -= process.env.HEAL_BATCH_SIZE;
    }
  }

  async runFound(): Promise<number> {
    let limit = process.env.HEAL_LOOKUP_DISTANCE;
    const transformer = new HexTransformer();
    let lowestIncorrect = Number.MAX_SAFE_INTEGER;

    console.log('Start check latest blocks (find reorganization)');

    const blocksToCheck: Array<{
      hash: string;
      height: number;
    }> = await this.transferRepository
      .query(
        `
        SELECT DISTINCT tr.blockHash as hash, tr.blockHeight as height
        FROM transfer_entity tr
        ORDER BY height DESC
        LIMIT ${limit};
        `,
      )
      .then(raw =>
        raw.map((r: any) => ((r.hash = transformer.from(r.hash as any)), r)),
      );

    const latestInNetwork = await this.web3.eth.getBlockNumber();
    if (
      latestInNetwork - limit >
      blocksToCheck[blocksToCheck.length - 1].height
    ) {
      return;
    }

    console.log('Ask node for latest blocks');

    const batch = new PromisifyBatchRequest(this.web3);
    blocksToCheck.forEach(b =>
      batch.add((this.web3.eth.getBlock as any).request, b.height),
    );

    const blocks: { [hash: string]: Block } = await Bluebird.resolve(
      batch
        .execute()
        .then(blocks =>
          blocks.reduce(
            (dict, block) => ((dict[block.hash] = block), dict),
            {},
          ),
        ),
    ).timeout(5000, 'getBlock timeout');

    const incorrects = blocksToCheck.filter(
      b => typeof blocks[b.hash] === 'undefined',
    );

    if (incorrects.length) {
      console.log(`Found ${incorrects.length} incorrect blocks`);
      lowestIncorrect = incorrects[incorrects.length - 1].height;
      console.log(`Lowest incorrect is ${lowestIncorrect}`);

      return lowestIncorrect;
    } else {
      return -1;
    }
  }
}
