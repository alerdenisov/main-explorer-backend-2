import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TransferEntityRepository,
  TransferEntity,
  TransferEntityArchive,
  TransferEntityArchiveRepository,
} from 'entities/transfer.entity';
import { TransferEventsDemon } from './transfer-events.demon';
import { TransactionDemon } from './transaction.demon';
import Web3 = require('web3');
import erc20 = require('./erc20.json');
import {
  TransactionEntity,
  TransactionEntityRepository,
  TransactionEntityArchive,
  TransactionEntityArchiveRepository,
} from 'entities/transaction.entity';
import { WebsocketProvider } from 'web3/providers';
import { HolderEntity, HolderEntityRepository } from 'entities/holder.entity';
import { BalancesDemon } from './balances.demon';
import { DatetimeDemon } from './datetime.demon';
import { DemonExecute } from './demon-execute';
import { HealerDemon } from './healer.demon';

@Module({
  providers: [
    {
      provide: Logger,
      useValue: new Logger(ExporterModule.name),
    },
    {
      provide: 'web3factory',
      useFactory: () => (): { web3: Web3; provider: WebsocketProvider } => {
        const provider = new Web3.providers.WebsocketProvider(
          process.env.NODE_URL,
        );
        const web3 = new Web3(provider);

        return {
          provider,
          web3,
        };
      },
    },
    HealerDemon,
    TransferEventsDemon,
    TransactionDemon,
    BalancesDemon,
    DatetimeDemon,

    DemonExecute,
  ],
  imports: [
    TypeOrmModule.forFeature([
      TransferEntity,
      TransferEntityRepository,
      TransferEntityArchive,
      TransferEntityArchiveRepository,
      TransactionEntity,
      TransactionEntityRepository,
      TransactionEntityArchive,
      TransactionEntityArchiveRepository,
      HolderEntity,
      HolderEntityRepository,
    ]),
  ],
})
export class ExporterModule {}
