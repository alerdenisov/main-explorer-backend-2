import { HexTransformer } from 'entities/hex.transformer';
import { BigNumberTransformer } from 'entities/bignumber.transformer';
import { ColumnOptions } from 'typeorm';
import BN from 'bignumber.js';

export const ADDRESS_REGEX = new RegExp(/^0x([A-z0-9]{40})$/);
export const HASH_REGEX = new RegExp(/^0x([A-z0-9]{64})$/);
export const BINARY_REGEX = new RegExp(/^0x([A-z0-9]+)$/);

export const ADDRESS_COLUMN: ColumnOptions = {
  length: 20,
  transformer: new HexTransformer(20),
  type: 'binary',
};
export const HASH_COLUMN: ColumnOptions = {
  length: 32,
  transformer: new HexTransformer(32),
  type: 'binary',
};

export const BINARY_COLUMN: ColumnOptions = {
  transformer: new HexTransformer(),
  type: 'varbinary',
};

export const BIGNUM_COLUMN: ColumnOptions = {
  length: 79, // length of string representation of 2^256-1,
  transformer: new BigNumberTransformer(),
  default: new BN(0),
  type: 'char',
};
