import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransferEntityRepository } from 'entities/transfer.entity';
import {
  TransactionEntityRepository,
  TransactionEntity,
} from 'entities/transaction.entity';
import { DeepPartial, In } from 'typeorm';
import bn from 'bignumber.js';
import { Transaction, Block } from 'web3/eth/types';
import { validate, validateOrReject } from 'class-validator';
import { BaseNetworkDemon } from './base-network.demon';
import Contract from 'web3/eth/contract';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import * as Bluebird from 'bluebird';
import { HolderEntityRepository, HolderEntity } from 'entities/holder.entity';
import { HexTransformer } from 'entities/hex.transformer';

@Injectable()
export class DatetimeDemon extends BaseNetworkDemon {
  constructor(
    logger: Logger,
    @Inject('web3factory')
    web3factory: () => {
      web3: Web3;
      provider: WebsocketProvider;
    },
    @InjectRepository(TransferEntityRepository)
    private readonly transferRepository: TransferEntityRepository,
  ) {
    super(logger, web3factory);
  }

  async execute() {
    if (!this.transferRepository) {
      await Bluebird.delay(200);
      return;
    }

    console.log('get datetime of transfer');

    const [pending, total] = await this.transferRepository.findAndCount({
      where: {
        date: null,
      },
      take: 100,
    });

    if (total <= 0) {
      return;
    }

    console.log(`Found ${total} transfers without datetime`);

    const blockHeights = new Set(pending.map(t => t.blockHeight));
    const blocks = await Bluebird.all(
      Array.from(blockHeights).map(h => this.web3.eth.getBlock(h)),
    ).then(arr =>
      arr.reduce((dict, block) => ((dict[block.number] = block), dict), {} as {
        [height: number]: Block;
      }),
    );

    await this.transferRepository.save(
      pending.map(
        p => ((p.date = new Date(blocks[p.blockHeight].timestamp * 1000)), p),
      ),
    );
  }
}
