import {
  Index,
  Column,
  ManyToOne,
  PrimaryColumn,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { HASH_COLUMN, HASH_REGEX } from 'database/commot';
import { ReversedEnity } from './reversed.entity';
import { Matches } from 'class-validator';
import { BlockEnity } from './block.entity';
import { TransactionEntity } from './transaction.entity';

export abstract class EventEntity extends ReversedEnity {
  @Matches(HASH_REGEX)
  @PrimaryColumn(HASH_COLUMN)
  eventId: string;

  @ManyToOne(type => TransactionEntity, tx => tx.events)
  @JoinTable({ name: 'txHash' })
  transaction: TransactionEntity;

  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN)
  txHash: string;

  @ManyToOne(type => BlockEnity)
  @JoinColumn({ name: 'blockHash' })
  block: BlockEnity;

  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN)
  blockHash: string;
}
