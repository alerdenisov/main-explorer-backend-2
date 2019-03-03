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
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { Matches } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { ADDRESS_REGEX, BIGNUM_COLUMN, ADDRESS_COLUMN } from 'validation-rules';
import BN from 'bignumber.js';
import { ExtendedRepository } from './extended-repository';
import { TransferEntity } from './transfer.entity';

@Entity()
export class HolderEntity {
  @PrimaryColumn(ADDRESS_COLUMN)
  @Matches(ADDRESS_REGEX)
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(t => TransferEntity)
  engaged: TransferEntity[];

  @Index()
  @Column('int', { unsigned: true })
  lastBlock: number;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toFixed())
  incoming: BN;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toFixed())
  outgoing: BN;

  @Column(BIGNUM_COLUMN)
  @Transform(v => v.toFixed())
  balance: BN;

  @Index()
  @Column('double', { default: 0 })
  estimateBalance: number;

  @Index()
  @Column('boolean', { default: true })
  dirty: boolean;
}

@EntityRepository(HolderEntity)
export class HolderEntityRepository extends ExtendedRepository<HolderEntity> {}
