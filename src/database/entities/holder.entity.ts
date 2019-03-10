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
  JoinColumn,
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
} from 'database/commot';
import { utils } from 'ethers';
import { EventEntity } from './event.entity';

@Entity()
export class HolderUpdateEntity extends ReversedEnity {
  @Index()
  @Matches(ADDRESS_REGEX)
  holderAddress: string;

  @OneToMany(type => HolderEntity, holder => holder.updates)
  @JoinColumn({ name: 'holderAddress' })
  holder: HolderEntity;

  @ManyToOne(type => EventEntity)
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;
  
  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN)
  eventId: string;
}

@Entity()
export class HolderEntity extends ReversedEnity {
  @PrimaryColumn(ADDRESS_COLUMN)
  @Matches(ADDRESS_REGEX)
  address: string;

  @ManyToOne(type => HolderUpdateEntity, update => update.holder)
  updates: HolderUpdateEntity[];

  @Column(BIGNUM_COLUMN)
  @Transform(BIGNUM_TRANSFORM)
  incomingSum: utils.BigNumber;

  @Column(BIGNUM_COLUMN)
  @Transform(BIGNUM_TRANSFORM)
  outgoingSum: utils.BigNumber;

  @Column(BIGNUM_COLUMN)
  @Transform(BIGNUM_TRANSFORM)
  balance: utils.BigNumber;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('double', { default: 0 })
  estimateBalance: number;
}
