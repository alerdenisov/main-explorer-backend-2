import { Transform } from 'class-transformer';
import {
  Entity,
  Column,
  EntityRepository,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
  JoinTable,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Matches } from 'class-validator';
import { ReversedEnity } from './reversed.entity';
import {
  ADDRESS_COLUMN,
  ADDRESS_REGEX,
  BIGNUM_COLUMN,
  BIGNUM_TRANSFORM,
  HASH_REGEX,
  HASH_COLUMN,
} from 'database/common';
import { utils } from 'ethers';
import { TransferEntity } from './transfer.entity';

@Entity()
export class HolderEntity extends ReversedEnity {
  @PrimaryColumn(ADDRESS_COLUMN())
  @Matches(ADDRESS_REGEX)
  address: string;

  @ManyToOne(type => HolderUpdateEntity, update => update.holder)
  updates: HolderUpdateEntity[];

  @Column(BIGNUM_COLUMN())
  @Transform(BIGNUM_TRANSFORM)
  incomingSum: utils.BigNumber;

  @Column(BIGNUM_COLUMN())
  @Transform(BIGNUM_TRANSFORM)
  outgoingSum: utils.BigNumber;

  @Column(BIGNUM_COLUMN())
  @Transform(BIGNUM_TRANSFORM)
  balance: utils.BigNumber;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('double', { default: 0 })
  estimateBalance: number;
}

@Entity()
export class HolderUpdateEntity extends ReversedEnity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column(ADDRESS_COLUMN())
  @Matches(ADDRESS_REGEX)
  holderAddress: string;

  @OneToMany(type => HolderEntity, holder => holder.updates)
  @JoinTable({ name: 'holderAddress' })
  holder: HolderEntity;

  @ManyToOne(type => TransferEntity)
  @JoinTable({ name: 'transferId' })
  event: TransferEntity;

  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN())
  transferId: string;
}
