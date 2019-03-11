import { ColumnOptions } from 'typeorm';
import { ValueTransformer, FindOperator } from 'typeorm';
import { utils } from 'ethers';

export class HexTransformer implements ValueTransformer {
  constructor(private readonly size?: number) {}

  to(value: string | FindOperator<string>): Buffer | FindOperator<Buffer> {
    if (value instanceof FindOperator) {
      const anyOp = value as any;
      anyOp._value = anyOp._value.map((s: string) => this.parseTo(s));
      return anyOp;
    } else {
      return this.parseTo(value);
    }
  }

  parseTo(value: string): Buffer {
    const raw = value.startsWith('0x') ? value.substr(2) : value;
    return Buffer.from(raw.toLowerCase(), 'hex');
  }

  from(value: Buffer) {
    return `0x${value.toString('hex').toLowerCase()}`;
  }
}

export class BigNumberTransformer implements ValueTransformer {
  to(value: utils.BigNumber): string {
    return value.toString();
  }

  from(value: string): utils.BigNumber {
    return new utils.BigNumber(value);
  }
}

export const ADDRESS_REGEX = new RegExp(/^0x([A-z0-9]{40})$/);
export const HASH_REGEX = new RegExp(/^0x([A-z0-9]{64})$/);
export const BINARY_REGEX = new RegExp(/^0x([A-z0-9]+)$/);

export function ADDRESS_COLUMN(): ColumnOptions {
  return {
    length: 20,
    transformer: new HexTransformer(20),
    type: 'binary',
  };
}

export function HASH_COLUMN(): ColumnOptions {
  return {
    length: 32,
    transformer: new HexTransformer(32),
    type: 'binary',
  };
}

export function BINARY_COLUMN(): ColumnOptions {
  return {
    transformer: new HexTransformer(),
    type: 'varbinary',
  };
}

export function BIGNUM_COLUMN(): ColumnOptions {
  return {
    length: 79, // length of string representation of 2^256-1,
    transformer: new BigNumberTransformer(),
    default: new utils.BigNumber(0),
    type: 'char',
  };
}

export const BIGNUM_TRANSFORM = (v: utils.BigNumber | string) =>
  v instanceof utils.BigNumber ? v.toString() : new utils.BigNumber(v);
