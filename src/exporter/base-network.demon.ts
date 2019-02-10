import { Injectable, Inject, Logger } from '@nestjs/common';
import Contract from 'web3/eth/contract';
import Web3 = require('web3');
import { WebsocketProvider } from 'web3/providers';
import erc20 = require('./erc20.json');
import * as Bluebird from 'bluebird';

@Injectable()
export abstract class BaseNetworkDemon {
  token: Contract;
  web3: Web3;
  constructor(
    private readonly logger: Logger,
    private readonly web3factory: () => {
      web3: Web3;
      provider: WebsocketProvider;
    },
  ) {
    this.connectToNetwork();

    Bluebird.config({
      cancellation: true,
    });

    this.wrapper(this.run.bind(this));
  }

  connectToNetwork(): any {
    const { web3, provider } = this.web3factory();
    this.web3 = web3;

    this.token = new this.web3.eth.Contract(
      <any>erc20,
      process.env.CONTRACT_ADDRESS,
    );

    provider.on('end', () => {
      console.log('reconnect to network');
      this.connectToNetwork();
    });
  }

  async wrapper(func: () => Promise<any>) {
    while (true) {
      try {
        await func();
      } catch (e) {
        console.error(e);
      }
    }
  }

  abstract run(): Promise<any>;
}
