import { ValueTransformer } from 'typeorm';
import bn from 'bignumber.js';

export class BigNumberTransformer implements ValueTransformer {
  to(value: bn): string {
    return value.toFixed();
  }

  from(value: string): bn {
    return new bn(value, 10);
  }
}
