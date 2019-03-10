import { Entity, Index, Column } from 'typeorm';
import {
  ADDRESS_COLUMN,
  ADDRESS_REGEX,
  BIGNUM_COLUMN,
  BIGNUM_TRANSFORM,
} from 'database/commot';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { utils } from 'ethers';
import { EventEntity } from './event.entity';

@Entity()
export class TransferEntity extends EventEntity {
  @Index()
  @Matches(ADDRESS_REGEX)
  @Column(ADDRESS_COLUMN)
  from: string;
  
  @Index()
  @Matches(ADDRESS_REGEX)
  @Column(ADDRESS_COLUMN)
  to: string;
  
  @Transform(BIGNUM_TRANSFORM)
  @Column(BIGNUM_COLUMN)
  value: utils.BigNumber;
}
