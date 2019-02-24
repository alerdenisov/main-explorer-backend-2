import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  EntityRepository,
} from 'typeorm';
import {
  HASH_COLUMN,
  HASH_REGEX,
  ADDRESS_COLUMN,
  ADDRESS_REGEX,
  BIGNUM_COLUMN,
  BINARY_COLUMN,
  BINARY_REGEX,
} from 'validation-rules';
import { Matches, IsPositive } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import BN from 'bignumber.js';
import { ExtendedRepository } from './extended-repository';

@Entity()
export class TransactionEntity {
  @PrimaryColumn(HASH_COLUMN)
  @Matches(HASH_REGEX)
  hash: string;

  @Column('int', { unsigned: true })
  @IsPositive()
  nonce: number;

  @Index()
  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  blockHash: string;

  @Index()
  @Column('int', { unsigned: true })
  @IsPositive()
  blockNumber: number;

  @Column('smallint', { unsigned: true })
  @IsPositive()
  transactionIndex: number;

  @Index()
  @Column(ADDRESS_COLUMN)
  @Matches(ADDRESS_REGEX)
  from: string;

  @Index()
  @Column(ADDRESS_COLUMN)
  @Matches(ADDRESS_REGEX)
  to: string;

  @ApiModelProperty({
    description: 'Amount of money sent',
  })
  @Transform(v => v.toFixed())
  @Column(BIGNUM_COLUMN)
  value: BN;

  @ApiModelProperty({
    description: 'Amount of money sent',
  })
  @Transform(v => v.toFixed())
  @Column(BIGNUM_COLUMN)
  gasPrice: BN;

  @Column('int', { unsigned: true })
  @IsPositive()
  gas: number;

  // @Column(BINARY_COLUMN)
  // @Matches(BINARY_REGEX)
  // input: string;

  @Column('int')
  v: number;

  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  r: string;

  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  s: string;
}

@EntityRepository(TransactionEntity)
export class TransactionEntityRepository extends ExtendedRepository<
  TransactionEntity
> {}

@Entity({
  name: 'transaction_entity_archive',
})
export class TransactionEntityArchive extends TransactionEntity {}

@EntityRepository(TransactionEntityArchive)
export class TransactionEntityArchiveRepository extends TransactionEntityRepository {}
