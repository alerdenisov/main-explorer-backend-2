import { Test, TestingModule } from '@nestjs/testing';
import { BlockController, BlockService } from './block.module';
import { Logger } from '@nestjs/common';
import { sourceCode, abi } from '../erc20';
import { ethers, Contract } from 'ethers';
import {
  Provider,
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers/providers';
import { Func } from 'common/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BigNumber, Transaction } from 'ethers/utils';
import { config } from 'common/env';
import { HolderUpdateDto, BlockDto } from 'common/dto';
const ganache = require('ganache-cli');

// type Web3Factory = () => { web3: Web3; provider: Provider };

const blockHashes = [
  '0xe85cf04c4cc92a7d83bfe11ab50038810593b7f5ccf7f91fb1913261bd420911', // test tx
  '0x6065a348f327b2439c8840e84378266f5de10f5bed69a205553821fd2804ee30', // deploy
  '0x8c55598180fa47b30c24a5282b6c023128c66f68c68e481dba7c9b4071fbe1fe', // unfreeze
  '0x221c2f075f4f347fc1f96d330327d094ed263baf9b729c86bfda8d880e60123d', // forked tx
];

class BlockTestContext {
  testNode: any;
  chain: any;
  module: TestingModule;
  token: Contract;
  latestBlock: BlockDto;
}

const ctx: BlockTestContext = new BlockTestContext();

function waitReceipt(
  provider: JsonRpcProvider,
): (
  tx: TransactionResponse,
) => Promise<TransactionReceipt & TransactionResponse> {
  return async function(tx: TransactionResponse) {
    let receipt: TransactionReceipt = null;
    while (!receipt || !receipt.blockHash) {
      receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.blockHash) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return Object.assign({}, tx, receipt);
  };
}

async function setupContext() {
  ctx.testNode = ganache.server({
    time: new Date(0),
    blockTime: 5,
    mnemonic:
      'dead fish racket soul plunger dirty boats cracker mammal nicholas cage',
  });
  ctx.chain = await new Promise(resolve =>
    ctx.testNode.listen(9933, function(err: Error, chain: any) {
      resolve(chain);
    }),
  );

  ctx.module = await Test.createTestingModule({
    controllers: [BlockController],
    providers: [
      {
        provide: Logger,
        useValue: new Logger('test logger'),
      },
      {
        provide: 'provider',
        useFactory: () => () =>
          new ethers.providers.JsonRpcProvider({
            url: 'http://localhost:9933',
            allowInsecure: true,
          }),
      },
      BlockService,
    ],
  }).compile();
}

describe('block exporter tests', () => {
  beforeAll(async () => {
    jest.setTimeout(60000);
    await config();

    await setupContext();
  });

  afterAll(async () => {
    ctx.testNode.close();
  });

  it('should have node', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    expect(await provider.getBlockNumber()).toEqual(0);
  });

  it('should increase height', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const signer0 = provider.getSigner(0);

    const tx = await signer0
      .sendTransaction({
        data: '0x',
        to: signer0.getAddress(),
        value: 0,
      })
      .then(waitReceipt(provider));

    expect(await provider.getBlockNumber()).toEqual(1);
  });

  it('deploy contract', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const signer0 = provider.getSigner(0);
    const erc20 = new ethers.ContractFactory(abi, sourceCode(), signer0);
    const result = await erc20.deploy();
    await Promise.resolve(result.deployTransaction).then(waitReceipt(provider));

    ctx.token = result;

    // deterministic address
    expect(result.address).toEqual(
      '0x9d35B9DC0eF17Acc3a8872566694cDa9fb484f34',
    );
    expect(
      await result.functions
        .totalSupply()
        .then((bn: BigNumber) => bn.toString()),
    ).toEqual('500000000000000000000000000');
  });

  it('initial state hashes', async () => {
    const service = ctx.module.get<BlockService>(BlockService);
    const update = await service.getStateUpdate({
      blockHeight: 0,
      tokenAddress: ctx.token.address,
    });

    console.log(JSON.stringify(update, null, 2));
    
    expect(update.incomingBlocks.length).toEqual(2);
    expect(update.incomingBlocks.map(b => b.blockHash!)).toEqual(
      blockHashes.slice(0, 2),
    );
  });

  it('initial minting transaction', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const accounts = await provider.listAccounts();
    const service = ctx.module.get<BlockService>(BlockService);
    const update = await service.getStateUpdate({
      blockHeight: 0,
      tokenAddress: ctx.token.address,
    });

    expect(update.incomingBlocks.length).toEqual(2);
    expect(update.incomingBlocks[1].transactions.length).toEqual(1);
    expect(update.incomingBlocks[1].holdersUpdate.length).toEqual(2);
    expect(update.incomingBlocks[1].transactions[0].sender).toEqual(
      accounts[0],
    );
    expect(update.incomingBlocks[1].holdersUpdate[0]).toEqual(<HolderUpdateDto>{
      address: '0x0000000000000000000000000000000000000000',
      incoming: '0',
      outgoing: '500000000000000000000000000',
    });
    expect(update.incomingBlocks[1].holdersUpdate[1]).toEqual(<HolderUpdateDto>{
      address: accounts[0],
      incoming: '500000000000000000000000000',
      outgoing: '0',
    });
  });

  it('unfreeze tokens', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const accounts = await provider.listAccounts();

    const token = new ethers.Contract(
      ctx.token.address,
      abi,
      provider.getSigner(0),
    );

    await token.functions.unfreeze().then(waitReceipt(provider));
  });

  it('make transfer transaction', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const accounts = await provider.listAccounts();
    const service = ctx.module.get<BlockService>(BlockService);

    const token = new ethers.Contract(
      ctx.token.address,
      abi,
      provider.getSigner(0),
    );

    console.log('unfrozen state: ', await token.functions.unfrozen());

    const result = await token.functions
      .transfer(accounts[1], ethers.utils.parseEther('1.0'))
      .then(waitReceipt(provider));

    const update = await service.getStateUpdate({
      // 1 - test
      // 2 - deploy
      // 3 - unfreeze
      blockHeight: 3,
      tokenAddress: ctx.token.address,
    });

    expect(update.incomingBlocks.length).toEqual(1);
    expect(update.incomingBlocks[0].transactions.length).toEqual(1);
    expect(update.incomingBlocks[0].holdersUpdate.length).toEqual(2);
    expect(update.incomingBlocks[0].transactions[0].sender).toEqual(
      accounts[0],
    );
    expect(update.incomingBlocks[0].holdersUpdate[0]).toEqual(<HolderUpdateDto>{
      address: accounts[0],
      incoming: '0',
      outgoing: ethers.utils.parseEther('1.0').toString(),
    });
    expect(update.incomingBlocks[0].holdersUpdate[1]).toEqual(<HolderUpdateDto>{
      address: accounts[1],
      incoming: ethers.utils.parseEther('1.0').toString(),
      outgoing: '0',
    });

    ctx.latestBlock = <BlockDto>update.incomingBlocks[0];
    console.log(
      JSON.stringify(
        await service
          .getStateUpdate({ blockHeight: 0, tokenAddress: ctx.token.address })
          .then(update => update.incomingBlocks.map(b => b.blockHash)),
      ),
    );
  });

  it('fork node', async () => {
    ctx.testNode.close();
    await setupContext();

    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const accounts = await provider.listAccounts();
    const service = ctx.module.get<BlockService>(BlockService);
    const signer0 = await provider.getSigner(0);

    const update = await service.getStateUpdate({
      // 1 - test
      // 2 - deploy
      // 3 - unfreeze
      // 4 - first tx
      // 5 - forked tx
      blockHeight: 0,
    });

    expect(update.incomingBlocks.length).toEqual(0);

    await signer0
      .sendTransaction({
        data: '0x',
        to: signer0.getAddress(),
        value: 0,
      })
      .then(waitReceipt(provider));

    const erc20 = new ethers.ContractFactory(abi, sourceCode(), signer0);
    const result = await erc20.deploy();
    await Promise.resolve(result.deployTransaction).then(waitReceipt(provider));

    const token = new ethers.Contract(
      ctx.token.address,
      abi,
      provider.getSigner(0),
    );

    await token.functions.unfreeze().then(waitReceipt(provider));
  });

  it('reverse block after fork', async () => {
    const provider = ctx.module.get<Func<JsonRpcProvider>>('provider')();
    const accounts = await provider.listAccounts();
    const service = ctx.module.get<BlockService>(BlockService);

    // await token.functions
    //   .transfer(accounts[3], ethers.utils.parseEther('1.0'))
    //   .then(waitReceipt(provider));

    const update = await service.getStateUpdate({
      // 1 - test
      // 2 - deploy
      // 3 - unfreeze
      // 4 - first tx
      // 5 - forked tx
      blockHeight: ctx.latestBlock.blockHeight,
      blockHash: ctx.latestBlock.blockHash,
      tokenAddress: ctx.token.address,
    });

    console.log(JSON.stringify(update, null, 2));
  });
});
