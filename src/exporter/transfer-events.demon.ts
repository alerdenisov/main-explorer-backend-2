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
import erc20 = require('./erc20.json');
import * as Bluebird from 'bluebird';

import Contract from 'web3/eth/contract';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import { EventLog } from 'web3/types';

@Injectable()
export class TransferEventsDemon extends BaseNetworkDemon {
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

    let lastBlock = lastEvent ? lastEvent.blockHeight : process.env.FROM_BLOCK;

    const block = await Bluebird.resolve(
      this.web3.eth.getBlockNumber(),
    ).timeout(10000, 'getBlockNumber() timeout');

    console.log('export transfer events since', lastBlock, 'in chain', block);

    let found = false;
    let events: EventLog[];

    while (!found) {
      if (lastBlock >= block) {
        return;
      }

      let lookupBlocks = Math.min(
        process.env.LOOKUP_DISTANCE,
        block - lastBlock,
      );

      console.log(
        `get events from ${lastBlock + 1} to ${lastBlock +
          lookupBlocks} (max: ${block}, left: ${block - lastBlock})`,
      );

      events = await Bluebird.resolve(
        this.token.getPastEvents('Transfer', {
          fromBlock: lastBlock + 1,
          toBlock: lastBlock + lookupBlocks,
        }),
      ).timeout(10000, 'getPastEvents(Transfer) timeout');

      console.log(`got ${events.length} events`);

      if (events.length === 0) {
        lastBlock += lookupBlocks;
      } else {
        found = true;
      }
    }

    // console.log(JSON.stringify(events, null, 2));

    await this.transferRepository.save(
      events.map(ev => {
        console.assert(ev.blockNumber, 'Block is required');
        console.assert(ev.transactionHash, 'TX hash is require');
        console.assert(ev.returnValues.from, 'sender is require');
        console.assert(ev.returnValues.to, 'receiver is require');
        console.assert(ev.returnValues.value, 'value is require');
        const te = new TransferEntity();
        te.blockHeight = ev.blockNumber;
        te.blockHash = ev.blockHash;
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
  }
}
