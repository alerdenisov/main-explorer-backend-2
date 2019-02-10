import { Transform, Expose, Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  Index,
  EntityRepository,
  AfterInsert,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { Matches } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { ADDRESS_REGEX, BIGNUM_COLUMN, ADDRESS_COLUMN } from 'validation-rules';
import BN from 'bignumber.js';
import { ExtendedRepository } from './extended-repository';

@Entity()
export class HolderEntity {
  @PrimaryColumn(ADDRESS_COLUMN)
  @Matches(ADDRESS_REGEX)
  address: string;

  @Column('int', { unsigned: true })
  lastChangeBlock: number;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toString(10))
  incomingSum: BN;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toString(10))
  outgoingSum: BN;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toString(10))
  balance: BN;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('double', { default: 0 })
  estimateBalance: number;
}

@EntityRepository(HolderEntity)
export class HolderEntityRepository extends ExtendedRepository<HolderEntity> {}
