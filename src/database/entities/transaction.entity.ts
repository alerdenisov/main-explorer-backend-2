import {
  Entity,
  Index,
  Column,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import {
  HASH_COLUMN,
  HASH_REGEX,
  ADDRESS_COLUMN,
  ADDRESS_REGEX,
  BIGNUM_COLUMN,
  BIGNUM_TRANSFORM,
} from 'database/commot';
import { ReversedEnity } from './reversed.entity';
import { Transform } from 'class-transformer';
import { Matches, IsPositive } from 'class-validator';
import { utils } from 'ethers';
import { BlockEnity } from './block.entity';
import { TransferEntity } from './transfer.entity';

@Entity()
export class TransactionEntity extends ReversedEnity {
  @PrimaryColumn(HASH_COLUMN)
  hash: string;

  @Column('int', { unsigned: true })
  @IsPositive()
  nonce: number;

  @ManyToOne(type => BlockEnity, block => block.transactions)
  block: BlockEnity;

  @OneToMany(type => TransferEntity, event => event.transaction)
  transfers: TransferEntity[];

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

  @Transform(BIGNUM_TRANSFORM)
  @Column(BIGNUM_COLUMN)
  gasPrice: utils.BigNumber;

  @Column('int', { unsigned: true })
  @IsPositive()
  gas: number;

  @Column('int', { unsigned: true })
  @IsPositive()
  gasLimit: number;

  @Column('int')
  v: number;

  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  r: string;

  @Column(HASH_COLUMN)
  @Matches(HASH_REGEX)
  s: string;
}
