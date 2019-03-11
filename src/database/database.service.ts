import { Injectable, Module, Controller } from '@nestjs/common';
import { Repository, Connection } from 'typeorm';
import { BlockEnity } from './entities/block.entity';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { TransferEntity } from './entities/transfer.entity';
import { HolderEntity, HolderUpdateEntity } from './entities/holder.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { StateUpdateDto, BlockDto, EventType, TransferDto } from 'common/dto';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { utils } from 'ethers';
import { validate, ValidationError } from 'class-validator';

@Injectable()
export class DatabaseService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(BlockEnity)
    private readonly blocksRepository: Repository<BlockEnity>,
    @InjectRepository(TransferEntity)
    private readonly transfersRepository: Repository<TransferEntity>,
    @InjectRepository(HolderEntity)
    private readonly holdersRepository: Repository<HolderEntity>,
    @InjectRepository(HolderUpdateEntity)
    private readonly holdersUpdateRepository: Repository<HolderUpdateEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}
  async addBlocks(blocks: BlockDto[]) {
    return this.connection.transaction(async function(this: never, em) {
      const blockRepository = em.getRepository(BlockEnity);
      const transactionsRepository = em.getRepository(TransactionEntity);
      const transfersRepository = em.getRepository(TransferEntity);

      let transactionEntities: TransactionEntity[] = [];
      let transferEntities: TransferEntity[] = [];

      const blockEntities = blocks.map(block => {
        const blockEntity = blockRepository.create();
        blockEntity.hash = block.blockHash;
        blockEntity.height = block.blockHeight;
        blockEntity.date = block.time;
        blockEntity.parentHash = block.parentHash;

        transactionEntities = blockEntity.transactions = block.transactions.map(
          tx => {
            const txEntity = transactionsRepository.create();
            txEntity.blockHash = blockEntity.hash;
            txEntity.from = tx.sender;
            txEntity.gasLimit = parseInt(tx.gasLimit);
            txEntity.gas = parseInt(tx.gasConsumed);
            txEntity.gasPrice = new utils.BigNumber(tx.gasPrice);
            txEntity.hash = tx.hash;
            txEntity.nonce = tx.nonce;
            txEntity.r = tx.r;
            txEntity.s = tx.s;
            txEntity.v = tx.v;
            txEntity.to =
              tx.receiver || '0x0000000000000000000000000000000000000000';
            txEntity.transactionIndex = tx.index;
            txEntity.date = blockEntity.date;

            txEntity.transfers = tx.events
              .filter(ev => ev.eventType === EventType.Transfer)
              .map((transfer: TransferDto) => {
                const transferEntity = transfersRepository.create();
                transferEntity.eventId = utils.id(
                  `${block.blockHash}_${tx.hash}_${transfer.eventIndex}`,
                );
                transferEntity.transactionHash = txEntity.hash;
                transferEntity.blockHash = blockEntity.hash;
                transferEntity.date = blockEntity.date;
                transferEntity.from = transfer.from;
                transferEntity.to = transfer.to;
                transferEntity.value = new utils.BigNumber(transfer.value);
                transferEntity.date = blockEntity.date;
                return transferEntity;
              });

            transferEntities = transferEntities.concat(txEntity.transfers);

            return txEntity;
          },
        );

        return blockEntity;
      });

      let errors: ValidationError[] = [];
      for (const block of blockEntities) {
        errors = errors.concat(await validate(block));

        for (const transaction of block.transactions) {
          errors = errors.concat(await validate(transaction));

          for (const transfer of transaction.transfers) {
            errors = errors.concat(await validate(transfer));
          }
        }
      }

      console.log(
        JSON.stringify(
          errors.map(error => ((error.target = null), error)),
          null,
          2,
        ),
      );

      if (errors.length) {
        throw new RpcException(errors);
      }

      await em.save(blockEntities);
      await em.save(transactionEntities);
      await em.save(transferEntities);
    });
  }

  async getLatestBlock(): Promise<BlockEnity> {
    return this.blocksRepository.findOne({
      order: {
        height: 'DESC',
      },
    });
  }

  async reverseBlock(hash: string): Promise<void> {
    var block = await this.blocksRepository.findOne({
      where: {
        hash,
      },
      relations: ['transactions', 'events', 'transfers'],
    });

    if (!block) {
      throw new RpcException(`Block ${hash} not found`);
    }

    console.log(block);
    throw new Error('prevent');
    // block.reversed = true;
  }

  async onModuleInit() {
    console.log('sync...');
    await this.connection.synchronize(true);
    console.log('done');
  }
}

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @MessagePattern({ service: 'db', cmd: 'apply_state' })
  async applyUpdate(update: StateUpdateDto) {
    console.log(JSON.stringify(update, null, 2));

    if (update.reversedBlocks && update.reversedBlocks.length) {
      // reverse blocks
      await Promise.all(
        update.reversedBlocks.map(hash =>
          this.databaseService.reverseBlock(hash),
        ),
      );
    } else if (update.incomingBlocks && update.incomingBlocks.length) {
      await this.databaseService.addBlocks(update.incomingBlocks);
    }

    return true
  }

  @MessagePattern({ service: 'db', cmd: 'get_latest_block' })
  async getLatestBlock(args: any): Promise<BlockEnity> {
    return this.databaseService.getLatestBlock();
  }
}

@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService],
  imports: [
    TypeOrmModule.forFeature([
      BlockEnity,
      TransferEntity,
      TransactionEntity,
      HolderEntity,
      HolderUpdateEntity,
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        synchronize: true,
        logging: process.env.DATABASE_VERBOSE,
        type: <any>process.env.DATABASE_TYPE,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_DB,
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      }),
    }),
  ],
})
export class DatabaseModule {
  constructor() {
    console.log({
      synchronize: true,
      logging: process.env.DATABASE_VERBOSE,
      type: <any>process.env.DATABASE_TYPE,
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    });
  }
}
