import { Entity, Index, Column, OneToMany, OneToOne } from 'typeorm';
import { HASH_COLUMN, HASH_REGEX } from 'database/commot';
import { ReversedEnity } from './reversed.entity';
import { Matches, IsPositive } from 'class-validator';
import { TransactionEntity } from './transaction.entity';

@Entity()
export class BlockEnity extends ReversedEnity {
  @Index({
    unique: true,
  })
  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  hash: string;

  @Index()
  @IsPositive()
  @Column('int', { unsigned: true })
  height: number;

  @Index()
  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  parentHash: string;

  @OneToMany(type => TransactionEntity, tx => tx.block)
  transactions: TransactionEntity[];
}
