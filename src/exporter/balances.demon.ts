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

  async run() {
    while (!this.transferRepository || !this.holdersRepository) {
      await Bluebird.delay(200);
    }

    while (true) {
      console.log('calculate holder balances');
      const hexTransformer = new HexTransformer(0);
      // const q = this.transferRepository
      //   .createQueryBuilder('transfer')
      //   .select('DISTINCT transfer.from as transfer_from');
      // console.log(q.getSql());

      // const spenders = await this.transferRepository
      //   .createQueryBuilder('transfer')
      //   .select('DISTINCT transfer.from as transfer_from')
      //   .getRawMany()
      //   .then((raw: Array<{ transfer_from: Buffer }>) =>
      //     raw.map(({ transfer_from }) => hexTransformer.from(transfer_from)),
      //   );

      // const receivers = await this.transferRepository
      // .createQueryBuilder('transfer')
      // .select('DISTINCT transfer.to as transfer_to')
      // .getRawMany()
      // .then((raw: Array<{ transfer_to: Buffer }>) =>
      //   raw.map(({ transfer_to }) => hexTransformer.from(transfer_to)),
      // );

      // console.log('spenders', spenders);

      // await Bluebird.delay(1000);

      const [pending, total] = await this.transferRepository.findAndCount({
        where: {
          processedBalance: false,
        },
        take: 10,
        order: {
          createAt: 'ASC',
        },
      });

      if (total <= 0 || pending.length <= 0) {
        continue;
      }

      console.log(`Found ${total} pending balances`);

      const balances = pending.reduce(
        (dict, event) => {
          dict[event.to] = dict[event.to] || new HolderEntity();
          dict[event.from] = dict[event.from] || new HolderEntity();

          dict[event.to].address = event.to;
          dict[event.from].address = event.from;

          dict[event.to].incomingSum = (
            dict[event.to].incomingSum || new bn(0)
          ).plus(event.amount);
          dict[event.to].outgoingSum = dict[event.to].outgoingSum || new bn(0);

          dict[event.from].incomingSum =
            dict[event.from].incomingSum || new bn(0);
          dict[event.from].outgoingSum = (
            dict[event.from].outgoingSum || new bn(0)
          ).plus(event.amount);

          dict[event.to].lastChangeBlock = Math.max(
            dict[event.to].lastChangeBlock || 0,
            event.blockHeight,
          );
          dict[event.from].lastChangeBlock = Math.max(
            dict[event.from].lastChangeBlock || 0,
            event.blockHeight,
          );

          dict[event.to].balance = dict[event.to].incomingSum.minus(
            dict[event.to].outgoingSum,
          );

          dict[event.from].balance = dict[event.from].incomingSum.minus(
            dict[event.from].outgoingSum,
          );

          dict[event.to].estimateBalance = dict[event.to].balance
            .div(new bn(10).pow(18))
            .toNumber();

          dict[event.from].estimateBalance = dict[event.from].balance
            .div(new bn(10).pow(18))
            .toNumber();

          return dict;
        },
        {} as { [address: string]: HolderEntity },
      );

      // const known = (await this.holdersRepository
      //   .createQueryBuilder('holder')
      //   .whereInIds(
      //     Object.keys(balances),
      //     // .map(address => hexTransformer.to(address)),
      //   )
      //   .getMany()).reduce(
      //   (dict, holder) => ((dict[holder.address] = holder), dict),
      //   {} as { [address: string]: HolderEntity },
      // );

      const known = (await this.holdersRepository.find({
        where: {
          address: In(Object.keys(balances)),
        },
      })).reduce(
        (dict, holder) => ((dict[holder.address] = holder), dict),
        {} as { [address: string]: HolderEntity },
      );

      for (let address in balances) {
        if (known[address]) {
          balances[address].incomingSum = balances[address].incomingSum.plus(
            known[address].incomingSum,
          );
          balances[address].outgoingSum = balances[address].outgoingSum.plus(
            known[address].outgoingSum,
          );

          balances[address].balance = balances[address].incomingSum.minus(
            balances[address].outgoingSum,
          );

          balances[address].estimateBalance = balances[address].balance
            .div(new bn(10).pow(18))
            .toNumber();
        }
      }

      await Promise.all(Object.values(balances).map(b => validateOrReject(b)));

      await this.holdersRepository.save(Object.values(balances));
      await this.transferRepository.save(
        pending.map(p => ((p.processedBalance = true), p)),
      );
    }
  }
}
