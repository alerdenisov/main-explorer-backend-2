import { Module, Controller, Injectable, Inject, Logger } from '@nestjs/common';
import { BaseNetworkService } from 'blockchain/base-network.service';
import {
  MessagePattern,
  ClientProxy,
  Client,
  Transport,
} from '@nestjs/microservices';
import {
  BlockDto,
  StateUpdateDto,
  TransactionDto,
  TransferDto,
  ApproveDto,
  EventDto,
  EventType,
  HolderUpdateDto,
} from 'common/dto';
import { DeepPartial } from 'common/types';
import * as Bluebird from 'bluebird';
import { ethers } from 'ethers';
import { Transaction, sha256, BigNumber } from 'ethers/utils';
import { Log, TransactionResponse, TransactionRequest } from 'ethers/providers';
import { ServiceModule } from 'service.module';
import { ClientProvider } from 'common/client.provider';
import { BlockEnity } from '../../../dist/database/entities/block.entity';

export interface UpdateRequestOptions {
  blockHeight: number;
  tokenAddress: string;
  blockHash: string;
}

@Injectable()
export class BlockService extends BaseNetworkService {
  createHolderUpdate(address: string) {
    const tmp = new HolderUpdateDto();
    tmp.address = address;
    tmp.incoming = '0';
    tmp.outgoing = '0';
    return tmp;
  }
  parseEvents(logs: Log[], options: Partial<UpdateRequestOptions>) {
    if (!options.tokenAddress) {
      return [];
    }

    return logs
      .map((log, index) => ({ log, index }))
      .filter(log => log.log.address === options.tokenAddress)
      .map(log => Object.assign(log, { parsed: this.erc20.parseLog(log.log) }))
      .filter(log => ['Transfer', 'Approve'].includes(log.parsed.name))
      .map(log => {
        switch (log.parsed.name) {
          case 'Transfer':
            const transfer = new TransferDto();
            transfer.from = log.parsed.values.from;
            transfer.to = log.parsed.values.to;
            transfer.value = log.parsed.values.value;
            transfer.eventIndex =
              log.log.logIndex || log.log.transactionLogIndex || log.index;
            return transfer;
          case 'Approve':
            const approve = new ApproveDto();
            approve.owner = log.parsed.values.owner;
            approve.spender = log.parsed.values.spender;
            approve.value = log.parsed.values.value;
            return approve;
          default:
            throw new Error('something wrong with parsing');
        }
      });
  }

  async getTransactionReceipt(
    index: number,
    txHash: string,
    options: Partial<UpdateRequestOptions>,
  ) {
    const native = Object.assign(
      await this.provider().getTransaction(txHash),
      await this.provider().getTransactionReceipt(txHash),
    );

    const tx = new TransactionDto();
    tx.sender = native.from;
    tx.nonce = native.nonce;
    tx.hash = native.transactionHash;
    tx.gasPrice = native.gasPrice.toString();
    tx.gasLimit = native.gasLimit.toString();
    tx.gasConsumed = native.gasUsed.toString();
    tx.r = native.r;
    tx.s = native.s;
    tx.v = native.v;
    tx.receiver = native.to;
    tx.events = this.parseEvents(native.logs, options);
    tx.index = index;
    return tx;
  }
  async getIncomingBlocks(
    since: number,
    options: Partial<UpdateRequestOptions>,
  ) {
    // Dirty hack there with asking for events before deep to acquiring chain data from network
    // So how it works?

    // 1) Take a list (just one if be honest) of token addresses what we're looking for
    // 2) Asking network about incoming events in lookup distance
    // 3) Prepere dictionary with blockhashes as keys and list of events corresponding to block as value
    // 4) Asking for a blocks (without tx)
    // 5) Map previously created dictionary to obtain list of blocks
    // 6) ...
    // 7) Profit :D

    console.log('request actual network height');
    const heightInNetwork = await Bluebird.resolve(
      this.provider().getBlockNumber(),
    ).timeout(process.env.BLOCK_REQUEST_TIMEOUT, 'Timeout getBlockNumber()');

    if (typeof heightInNetwork !== 'number') {
      throw new Error("Can't receive height of network " + heightInNetwork);
    }
    // new blocks
    let lookup = Math.min(
      process.env.BLOCK_MAX_LOOKUP_DISTANCE,
      heightInNetwork - since,
    );

    const events = await this.provider().getLogs({
      address: options.tokenAddress,
      topics: [], // any of them
      fromBlock: since + 1,
      toBlock: since + lookup + 1,
    });

    const txMap = events.reduce(
      (dict, log) => (
        (dict[log.blockHash!] = dict[log.blockHash!] || []),
        dict[log.blockHash].push(log.transactionHash),
        dict
      ),
      {} as { [blockHash: string]: string[] },
    );

    return await Bluebird.all(
      Array(lookup)
        .fill(0)
        .map((_, index) => {
          console.log(`start requesting block ${since + index + 1}`);
          return this.provider()
            .getBlock(since + index + 1, false)
            .then(block => {
              console.log(`received block ${since + index + 1}`);
              const a = new BlockDto();
              a.parentHash = block.parentHash;
              a.blockHash = block.hash;
              a.blockHeight = block.number;
              a.time = new Date(block.timestamp * 1000);
              a.transactionHashes =
                typeof txMap[block.hash] === 'undefined'
                  ? []
                  : txMap[block.hash];
              return a;
            });
        }),
    ).timeout(process.env.BLOCK_REQUEST_TIMEOUT, 'getBlock timeout');
  }

  async getStateUpdate(
    options: Partial<UpdateRequestOptions>,
  ): Promise<DeepPartial<StateUpdateDto>> {
    if (typeof options.blockHeight !== 'number') {
      throw new Error('Latest blockheight is important');
    }
    const update = new StateUpdateDto();

    // reverse block if it needed (and exit)
    if (options.blockHash) {
      // check if hash of latest known block is same
      const possibleSameLatest = await Bluebird.resolve(
        this.provider().getBlock(options.blockHeight),
      )
        .timeout(process.env.BLOCK_REQUEST_TIMEOUT)
        .catch(error => {
          console.log(process.env.WEB3_URL);
          throw new Error(
            'BlockModule Expection: Timeout on getBlockRequest' + __filename,
          );
        });

      if (!possibleSameLatest || possibleSameLatest.hash != options.blockHash) {
        // chain reorganization
        update.reversedBlocks.push(options.blockHash!);
        return update;
      }
    }

    update.incomingBlocks = await this.getIncomingBlocks(
      options.blockHeight,
      options,
    );

    for (let block of update.incomingBlocks) {
      console.log(
        `start requesting transaction from block #${block.blockHeight}`,
      );
      const transactions = await Bluebird.map(
        block.transactionHashes,
        (tx, index, len) =>
          Bluebird.resolve(
            this.getTransactionReceipt(index, tx, options),
          ).timeout(
            process.env.BLOCK_REQUEST_TIMEOUT,
            `Failed to request tx ${tx} – Timeout [${index} of ${len}]`,
          ),
        { concurrency: process.env.BLOCK_REQUEST_TX_BATCH },
      );

      console.log(
        `end requesting transaction from block #${block.blockHeight}`,
      );
      block.transactions = transactions.filter(tx => tx.events.length > 0);

      const transfers = block.transactions
        .map(tx => tx.events)
        .reduce((flat, events) => flat.concat(events), [])
        .filter(ev => ev.eventType == EventType.Transfer)
        .map(ev => ev as TransferDto);
      const holders = transfers.reduce(
        (holders, influence) => {
          const from = (holders[influence.from] =
            holders[influence.from] || this.createHolderUpdate(influence.from));

          const to = (holders[influence.to] =
            holders[influence.to] || this.createHolderUpdate(influence.to));

          from.outgoing = new BigNumber(from.outgoing)
            .add(influence.value)
            .toString();

          to.incoming = new BigNumber(to.incoming)
            .add(influence.value)
            .toString();

          return holders;
        },
        {} as { [address: string]: HolderUpdateDto },
      );

      block.holdersUpdate = Object.values(holders);
    }

    return update;
  }
}

@Controller('block')
export class BlockController {
  constructor(private readonly service: BlockService) {}

  @MessagePattern({ service: 'block', cmd: 'get_state_update' })
  getStateUpdate(
    payload: Partial<UpdateRequestOptions>,
  ): Promise<DeepPartial<StateUpdateDto>> {
    console.log('get_state_update call');
    return this.service.getStateUpdate(
      Object.assign(
        {
          blockHeight: 0,
        },
        payload,
      ),
    );
  }
}

@Injectable()
export class BlockchainDemon {
  constructor(private readonly client: ClientProxy) {
    this.run(); //.catch(e => this.loop());
  }

  async run() {
    let error = true;
    while (error) {
      try {
        await this.loop();
      } catch (e) {
        console.log(e);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  async loop() {
    await new Promise(resolve => setTimeout(resolve, 1500));
    while (true) {
      console.log('request latest block');
      const block = await Bluebird.resolve(
        this.client
          .send<BlockEnity, any>({ service: 'db', cmd: 'get_latest_block' }, {})
          .toPromise(),
      ).timeout(process.env.BLOCK_REQUEST_TIMEOUT, 'failure');

      const update = await this.client
        .send<any, Partial<UpdateRequestOptions>>(
          { service: 'block', cmd: 'get_state_update' },
          {
            blockHeight:
              typeof block !== 'undefined'
                ? block.height
                : process.env.BLOCK_FROM_BLOCK,
            tokenAddress: process.env.BLOCK_TOKEN_ADDRESS,
          },
        )
        .toPromise();

      // @MessagePattern({ service: 'db', cmd: 'apply_state' })
      console.log('apply update');
      await this.client
        .send<any, StateUpdateDto>(
          { service: 'db', cmd: 'apply_state' },
          update,
        )
        .toPromise();
    }
  }

  async onModuleInit() {
    console.log('connecting to mesh...');
    await this.client.connect();
    console.log('Done!');
  }
}

@Module({
  providers: [
    {
      provide: Logger,
      useValue: new Logger('test logger'),
    },
    ClientProvider,
    {
      provide: 'provider',
      useFactory: () => () =>
        new ethers.providers.JsonRpcProvider({
          url: process.env.WEB3_URL,
          allowInsecure: true,
        }),
    },
    BlockService,
    BlockchainDemon,
  ],
  controllers: [BlockController],
})
export class BlockModule {}
