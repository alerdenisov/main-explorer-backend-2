import {
  Module,
  Injectable,
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import {
  TransferEntity,
  TransferEntityRepository,
} from 'entities/transfer.entity';
import {
  TransactionEntityRepository,
  TransactionEntity,
} from 'entities/transaction.entity';
import { HolderEntityRepository, HolderEntity } from 'entities/holder.entity';
import { identity } from 'rxjs';
import { HexTransformer } from 'entities/hex.transformer';
import { classToPlain } from 'class-transformer';
import { Not, MoreThan } from 'typeorm';

const ok = <T>(data: T) => {
  return {
    status: 200,
    timestamp: Math.floor(new Date().getTime() / 1000),
    data,
  };
};

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class ApiController {
  constructor(
    @InjectRepository(TransferEntityRepository)
    private readonly transferRepository: TransferEntityRepository,
    @InjectRepository(TransactionEntityRepository)
    private readonly transactionRepository: TransactionEntityRepository,
    @InjectRepository(HolderEntityRepository)
    private readonly holderRepository: HolderEntityRepository,
  ) {}

  @Get('/info')
  async getInfo() {
    const holdersCount = await this.holderRepository.count();
    // const activity = await this.transferRepository.createQueryBuilder('transfer')
    // .select('UNIX_TIMESTAMP(transfer.date) as date')
    // .groupBy('date')
    const daysActivity: Array<{
      count: number;
      day: number;
    }> = await this.transactionRepository.query(
      'select *, count(*) as count from (select ((UNIX_TIMESTAMP(date) DIV 86400) * 86400) as day from transfer_entity WHERE date IS NOT NULL) as tbl GROUP BY tbl.day ORDER BY tbl.day DESC LIMIT 7;',
    );

    return ok({
      daysActivity,
      holdersCount,
    });
  }

  @Get('/holder/:address')
  async getHolder(
    @Param() { address }: { address: string },
    @Query()
    {
      limit = 15,
      page = 1,
    }: {
      limit: number;
      page: number;
    },
  ) {
    const holder = await this.holderRepository.findOne({
      where: {
        address,
      },
    });

    const involvedQuery = this.transferRepository
      .createQueryBuilder('transfer')
      .where('transfer.from = :from')
      .orWhere('transfer.to = :to')
      .orderBy('transfer.blockHeight', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .setParameters({
        to: new HexTransformer().to(address),
        from: new HexTransformer().to(address),
      });

    console.log(involvedQuery.getSql());
    console.log(involvedQuery.getParameters());

    const [transfers, total] = await involvedQuery.getManyAndCount();

    console.log(holder);

    return ok({
      holder: classToPlain(holder),
      transfers: transfers.map(t => classToPlain(t)),
      total,
    });
  }

  @Get('/tx/:hash')
  async getTransaction(@Param() { hash }: { hash: string }) {
    return ok({
      tx: await this.transactionRepository
        .findOne({
          where: {
            hash,
          },
        })
        .then(tx => classToPlain(tx)),
      transfers: await this.transferRepository
        .find({
          where: {
            txHash: hash,
          },
        })
        .then(transfers => transfers.map(t => classToPlain(t))),
    });
  }

  @Get('/txs')
  async getTransactions(@Query()
  {
    limit = 15,
    page = 1,
  }: {
    limit: number;
    page: number;
  }) {
    const [events, total] = await this.transferRepository.findAndCount({
      where: {
        processedBalance: true,
        processedTransaction: true,
        date: MoreThan(new Date(0)),
      },
      order: {
        blockHeight: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return ok({
      events: events.map(e => classToPlain(e)),
      total,
    });
  }

  @Get('/top')
  async getTop(@Query()
  {
    limit = 15,
    page = 1,
  }: {
    limit: number;
    page: number;
  }) {
    const [holders, total] = await this.holderRepository.findAndCount({
      order: {
        estimateBalance: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return ok({
      holders: holders.map(h => classToPlain(h)),
      total,
    });
  }
}

@Injectable()
export class ApiService {}

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  imports: [
    TypeOrmModule.forFeature([
      TransferEntity,
      TransferEntityRepository,
      TransactionEntity,
      TransactionEntityRepository,
      HolderEntity,
      HolderEntityRepository,
    ]),
  ],
})
export class ApiModule {}
