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
    this.connection.transaction(async function(this: never, em) {
      const blockRepository = em.getRepository(BlockEnity);
      const transactionsRepository = em.getRepository(TransactionEntity);
      const transfersRepository = em.getRepository(TransferEntity);

      const blockEntities = blocks.map(block => {
        const blockEntity = blockRepository.create();
        blockEntity.hash = block.blockHash;
        blockEntity.height = block.blockHeight;
        blockEntity.date = block.time;
        blockEntity.parentHash = block.parentHash;

        blockEntity.transactions = block.transactions.map(tx => {
          const txEntity = transactionsRepository.create();
          txEntity.block = blockEntity;
          txEntity.from = tx.sender;
          txEntity.gasLimit = parseInt(tx.gasLimit);
          txEntity.gas = parseInt(tx.gasConsumed);
          txEntity.gasPrice = new utils.BigNumber(tx.gasPrice);
          txEntity.hash = tx.hash;
          txEntity.nonce = tx.nonce;
          txEntity.r = tx.r;
          txEntity.s = tx.s;
          txEntity.v = tx.v;
          txEntity.to = tx.receiver;
          txEntity.transactionIndex = tx.index;

          txEntity.transfers = tx.events
            .filter(
              ev =>
                ev.eventType === EventType.Transfer &&
                ev instanceof TransferDto,
            )
            .map((transfer: TransferDto) => {
              const transferEntity = transfersRepository.create();
              transferEntity.eventId = utils.sha256(
                `${block.blockHash}_${tx.hash}_${transfer.eventIndex}`,
              );
              transferEntity.transaction = txEntity;
              transferEntity.block = blockEntity;
              transferEntity.date = blockEntity.date;
              transferEntity.from = transfer.from;
              transferEntity.to = transfer.to;
              transferEntity.value = new utils.BigNumber(transfer.value);
              return transferEntity;
            });

          return txEntity;
        });
      });

      em.save(blockEntities);
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
}

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @MessagePattern({ service: 'db', cmd: 'apply_state' })
  async applyUpdate(update: StateUpdateDto) {
    if (update.reversedBlocks && update.reversedBlocks.length) {
      // reverse blocks
      update.reversedBlocks.forEach(hash =>
        this.databaseService.reverseBlock(hash),
      );
    } else if (update.incomingBlocks && update.incomingBlocks.length) {
      this.databaseService.addBlocks(update.incomingBlocks);
    }
  }

  @MessagePattern({ service: 'db', cmd: 'get_latest_update' })
  async getLatestBlock(): Promise<BlockEnity> {
    return this.databaseService.getLatestBlock();
  }
}

@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService],
  imports: [
    TypeOrmModule.forFeature([BlockEnity, TransferEntity, TransactionEntity, HolderEntity, HolderUpdateEntity]),
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
