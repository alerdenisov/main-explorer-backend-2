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

  async run() {
    while (!this.transferRepository) {
      await Bluebird.delay(200);
    }

    const lastEvent = await this.transferRepository.findOne({
      order: {
        blockHeight: 'DESC',
      },
    });

    let lastBlock = lastEvent ? lastEvent.blockHeight : process.env.FROM_BLOCK;

    while (true) {
      console.log('export transfer events');
      const block = await Bluebird.resolve(
        this.web3.eth.getBlockNumber(),
      ).timeout(10000, 'getBlockNumber() timeout');

      if (lastBlock < block) {
        // new block(s)
        let lookupBlocks = Math.min(100, block - lastBlock);
        console.log(
          `get events from ${lastBlock + 1} to ${lastBlock +
            lookupBlocks} (max: ${block}, left: ${block - lastBlock})`,
        );

        const events = await Bluebird.resolve(
          this.token.getPastEvents('Transfer', {
            fromBlock: lastBlock + 1,
            toBlock: lastBlock + lookupBlocks,
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

        lastBlock += lookupBlocks;
      }
    }
  }
}
