import Web3 = require('web3');
import { BatchRequest } from 'web3/eth/types';

export class PromisifyBatchRequest {
  batch: BatchRequest;
  requests: Promise<any>[];

  constructor(web3: Web3) {
    this.batch = new web3.BatchRequest();
    this.requests = [];
  }

  add(func: any, ...params: any[]) {
    let request = new Promise((resolve, reject) => {
      this.batch.add(
        func.call(null, ...params, (err: Error, data: any) => {
          if (err) return reject(err);
          resolve(data);
        }),
      );
    });

    this.requests.push(request);
  }

  async execute() {
    this.batch.execute();
    return await Promise.all(this.requests);
  }
}
