import { ValueTransformer, FindOperator } from 'typeorm';

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
