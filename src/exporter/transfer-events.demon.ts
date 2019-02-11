import BN from 'bignumber.js';
import { EventType } from 'entities/event.entity';
import { Connection } from 'typeorm';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  TransferEntityRepository,
  TransferEntity,
} from 'entities/transfer.entity';
import { BaseNetworkDemon } from './base-network.demon';
import Contract from 'web3/eth/contract';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import * as Bluebird from 'bluebird';
import erc20 = require('./erc20.json');

@Injectable()
export class TransferEventsDemon extends BaseNetworkDemon {
  lastBlock: number = 0;
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

    const lastEvent = await this.transferRepository.findOne({
      order: {
        blockHeight: 'DESC',
      },
    });

    this.lastBlock = Math.max(
      this.lastBlock,
      lastEvent ? lastEvent.blockHeight : process.env.FROM_BLOCK,
    );

    const block = await Bluebird.resolve(
      this.web3.eth.getBlockNumber(),
    ).timeout(10000, 'getBlockNumber() timeout');

    console.log(
      'export transfer events since',
      this.lastBlock,
      'in chain',
      block,
    );

    if (this.lastBlock >= block) {
      return;
    }
    // new block(s)
    let lookupBlocks = Math.min(100, block - this.lastBlock);
    console.log(
      `get events from ${this.lastBlock} to ${this.lastBlock +
        lookupBlocks} (max: ${block}, left: ${block - this.lastBlock})`,
    );

    const events = await Bluebird.resolve(
      this.token.getPastEvents('Transfer', {
        fromBlock: this.lastBlock,
        toBlock: this.lastBlock + lookupBlocks,
      }),
    ).timeout(10000, 'getPastEvents(Transfer) timeout');

    await this.transferRepository.save(
      events.map(ev => {
        console.assert(ev.blockNumber, 'Block is required');
        console.assert(ev.transactionHash, 'TX hash is require');
        console.assert(ev.returnValues.from, 'sender is require');
        console.assert(ev.returnValues.to, 'receiver is require');
        console.assert(ev.returnValues.value, 'value is require');
        const te = new TransferEntity();
        te.blockHeight = ev.blockNumber;
        te.from = ev.returnValues.from;
        te.to = ev.returnValues.to;
        te.amount = new BN(ev.returnValues.value);

        te.txHash = ev.transactionHash;
        te.eventId = this.web3.utils.sha3(
          `${ev.blockNumber}_${ev.transactionHash}_${ev.logIndex || 0}`,
        );
        te.eventType = EventType.Transfer;
        return te;
      }),
    );

    this.lastBlock += lookupBlocks;
  }
}
