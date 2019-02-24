import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiModelProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsByteLength, Length, Matches } from 'class-validator';
import { HASH_REGEX, HASH_COLUMN } from 'validation-rules';
import { HexTransformer } from './hex.transformer';
import { Transform } from 'class-transformer';

export enum EventType {
  Transfer = 'transfer',
  Approval = 'approval',
}

export abstract class EventEntity {
  @ApiModelProperty({
    description: 'Unique event id based on SHA256',
    required: true,
  })
  @Matches(HASH_REGEX)
  @PrimaryColumn(HASH_COLUMN)
  eventId: string;

  @ApiModelProperty({
    description: 'Hash of transaction contains current event',
    required: true,
  })
  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN)
  txHash: string;

  @ApiModelProperty({
    description: 'Height of block where transaction appear',
    required: true,
  })
  @Index()
  @Column('int')
  blockHeight: number;

  @Index()
  @Matches(HASH_REGEX)
  @Column(HASH_COLUMN)
  blockHash: string;

  @ApiModelProperty({
    description: 'ERC20 based event type',
    enum: EventType,
    required: true,
  })
  @Column('enum', { enum: EventType })
  @Index()
  eventType: EventType;

  @ApiModelProperty({
    description: 'Estimate time of event (based on block timestamp)',
    required: true,
  })
  @Transform((d: Date) => (d ? ~~(d.getTime() / 1000) : 0))
  @Column({ nullable: true })
  date: Date;

  @Index()
  @CreateDateColumn()
  createAt: Date;

  @Index()
  @UpdateDateColumn()
  updateAt: Date;
}
