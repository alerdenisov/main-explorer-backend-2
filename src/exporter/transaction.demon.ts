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

@Injectable()
export class TransactionDemon extends BaseNetworkDemon {
  constructor(
    logger: Logger,
    @Inject('web3factory')
    web3factory: () => {
      web3: Web3;
      provider: WebsocketProvider;
    },
    @InjectRepository(TransferEntityRepository)
    private readonly transferRepository: TransferEntityRepository,
    @InjectRepository(TransactionEntityRepository)
    private readonly transactionRepository: TransactionEntityRepository,
  ) {
    super(logger, web3factory);
  }

  async run() {
    console.log('export transactions');
    while (!this.transferRepository || !this.transactionRepository) {
      await Bluebird.delay(200);
    }

    while (true) {
      const [pending, total] = await this.transferRepository.findAndCount({
        where: {
          processedTransaction: false,
        },
        take: 1000,
        order: {
          createAt: 'ASC',
        },
      });

      if (total <= 0 || pending.length <= 0) {
        continue;
      }

      console.log(`Found ${total} pending transactions`);

      const hashes = new Set(pending.map(transfer => transfer.txHash));

      const known = await this.transactionRepository.find({
        where: {
          hash: In(Array.from(hashes)),
        },
      });

      known.forEach(tx => hashes.delete(tx.hash));

      function getBigNumber(tx: Transaction, field: keyof Transaction) {
        const value = tx[field];
        if (!value) {
          return new bn(0);
        }

        if (typeof value === 'string') {
          if (value.startsWith('0x')) {
            return new bn(value.substr(2), 16);
          }

          return new bn(value);
        }

        if (typeof value === 'number') {
          return new bn(value);
        }

        return new bn(0);
      }

      const transactions = await Bluebird.all(
        Array.from(hashes).map(hash =>
          Bluebird.resolve(this.web3.eth.getTransaction(hash)).timeout(
            10000,
            'getTransaction(Transfer) timeout',
          ),
        ),
      );

      const entities = transactions.map(tx => {
        console.assert(tx.hash, 'Hash is required');
        console.assert(tx.blockHash, 'Block hash is required');

        const entity = new TransactionEntity();
        entity.blockHash = tx.blockHash;
        entity.blockNumber = tx.blockNumber;
        entity.from = tx.from || '0x0000000000000000000000000000000000000000';
        entity.to = tx.to || '0x0000000000000000000000000000000000000000';
        entity.gas = tx.gas;
        entity.gasPrice = getBigNumber(tx, 'gasPrice');
        entity.hash = tx.hash;
        entity.nonce = tx.nonce;
        entity.r = tx.r;
        entity.s = tx.s;
        entity.transactionIndex = tx.transactionIndex || 0;
        entity.v = getBigNumber(tx, 'v').toNumber();
        entity.value = getBigNumber(tx, 'value');

        return entity;
      });

      await this.transferRepository.save(
        pending.map(p => ((p.processedTransaction = true), p)),
      );
      // console.log(pending.map(transfer => transfer.eventId));

      // await this.transferRepository.update(
      //   {
      //     eventId: In(pending.map(transfer => transfer.eventId)),
      //   },
      //   { processedTransaction: true },
      // );

      // console.log(transactions);

      await this.transactionRepository.save(entities);
    }
  }
}
