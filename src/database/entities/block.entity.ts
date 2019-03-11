import {
  Entity,
  Index,
  Column,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { HASH_COLUMN, HASH_REGEX } from 'database/common';
import { ReversedEnity } from './reversed.entity';
import { Matches, IsPositive } from 'class-validator';
import { TransactionEntity } from './transaction.entity';

@Entity()
export class BlockEnity extends ReversedEnity {
  @PrimaryColumn(HASH_COLUMN())
  hash: string;

  @Index({
    unique: false,
  })
  @IsPositive()
  @Column('int', { unsigned: true })
  height: number;

  @Index({
    unique: false,
  })
  @Column(HASH_COLUMN())
  @Matches(HASH_REGEX)
  parentHash: string;

  @OneToMany(type => TransactionEntity, tx => tx.block)
  transactions: TransactionEntity[];
}
