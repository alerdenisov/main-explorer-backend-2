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
  @JoinTable()
  engaged: TransferEntity[];

  @Index()
  @Column('double')
  incoming: number;

  @Index()
  @Column('double')
  outgoing: number;

  @Index()
  @Column('double')
  balance: number;

  @Index()
  @Column('boolean')
  dirty: boolean;
}

@EntityRepository(HolderEntity)
export class HolderEntityRepository extends ExtendedRepository<HolderEntity> {}
