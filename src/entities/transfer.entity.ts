import { Transform, Expose, Exclude } from 'class-transformer';
import { Entity, Column, Index, EntityRepository, AfterInsert } from 'typeorm';
import { EventEntity } from './event.entity';
import { Matches } from 'class-validator';
import { ApiModelProperty } from '@nestjs/swagger';
import { ADDRESS_REGEX, BIGNUM_COLUMN, ADDRESS_COLUMN } from 'validation-rules';
import BN from 'bignumber.js';
import { ExtendedRepository } from './extended-repository';

@Entity()
export class TransferEntity extends EventEntity {
  @ApiModelProperty({
    description: 'Address of money sender',
    required: true,
  })
  @Index()
  @Matches(ADDRESS_REGEX)
  @Column(ADDRESS_COLUMN)
  from: string;

  @ApiModelProperty({
    description: 'Address of money receiver',
    required: true,
  })
  @Index()
  @Matches(ADDRESS_REGEX)
  @Column(ADDRESS_COLUMN)
  to: string;

  @ApiModelProperty({
    description: 'Amount of money sent',
  })
  @Transform(v => v.toFixed())
  @Column(BIGNUM_COLUMN)
  amount: BN;

  @Index()
  @Column({ default: false })
  processedBalance: boolean;

  @Index()
  @Column({ default: false })
  processedTransaction: boolean;
}

@EntityRepository(TransferEntity)
export class TransferEntityRepository extends ExtendedRepository<
  TransferEntity
> {
  createTransfer(from: string, to: string, amount: string) {
    const event = this.create();
  }
}

@Entity({
  name: 'transfer_entity_archive',
})
export class TransferEntityArchive extends TransferEntity {}

@EntityRepository(TransferEntityArchive)
export class TransferEntityArchiveRepository extends ExtendedRepository<
  TransferEntityArchive
> {}
