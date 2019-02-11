import { Injectable } from '@nestjs/common';
import { TransferEventsDemon } from './transfer-events.demon';
import { TransactionDemon } from './transaction.demon';
import { BalancesDemon } from './balances.demon';
import { DatetimeDemon } from './datetime.demon';
import * as Bluebird from 'bluebird';

async function of(handle: Promise<any>) {
  try {
    return await handle;
  } catch (e) {
    console.log('[err]: ', e);
    return e;
  }
}

@Injectable()
export class DemonExecute {
  constructor(
    private readonly TransferEventsDemon: TransferEventsDemon,
    private readonly TransactionDemon: TransactionDemon,
    private readonly BalancesDemon: BalancesDemon,
    private readonly DatetimeDemon: DatetimeDemon,
  ) {
    this.loop();
  }
  async loop() {
    while (true) {
      await of(this.TransferEventsDemon.execute());
      await of(this.TransactionDemon.execute());
      await of(this.BalancesDemon.execute());
      await of(this.DatetimeDemon.execute());
      await Bluebird.delay(100);
    }
  }
}
