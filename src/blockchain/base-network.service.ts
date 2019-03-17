import { Injectable, Logger, Inject } from '@nestjs/common';
import { abi } from './erc20';
import * as Bluebird from 'bluebird';
import { Provider } from 'ethers/providers';
import { ethers } from 'ethers';
import { Interface } from 'ethers/utils';

@Injectable()
export abstract class BaseNetworkService {
  public erc20: Interface;
  constructor(
    private readonly logger: Logger,
    @Inject('provider')
    protected readonly provider: () => Provider,
  ) {
    this.connectToNetwork();

    this.erc20 = new Interface(abi)

    Bluebird.config({
      cancellation: true,
    });
  }

  connectToNetwork(): any {
    const provider = this.provider();

    provider
      .getNetwork()
      .then(network => network.chainId)
      .catch(e => {
        console.log('reconnect to network');
        return this.connectToNetwork();
      });

    return provider;
  }
}
// export class PromisifyBatchRequest {
//   batch: BatchRequest;
//   requests: Promise<any>[];

//   constructor(web3: Web3) {
//     this.batch = new web3.BatchRequest();
//     this.requests = [];
//   }

//   add(func: any, ...params: any[]) {
//     let request = new Promise((resolve, reject) => {
//       this.batch.add(
//         func.call(null, ...params, (err: Error, data: any) => {
//           if (err) return reject(err);
//           resolve(data);
//         }),
//       );
//     });

//     this.requests.push(request);
//   }

//   async execute() {
//     this.batch.execute();
//     return await Promise.all(this.requests);
//   }
// }
