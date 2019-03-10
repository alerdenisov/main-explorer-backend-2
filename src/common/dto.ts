export class HolderUpdateDto {
  address: string;
  incoming: string;
  outgoing: string;
}

export enum EventType {
  Transfer,
  Approve,
  Burn,
  Mint,
}

export abstract class EventDto {
  eventId: string;
  abstract get eventType(): EventType;
}

export class TransferDto extends EventDto {
  eventType = EventType.Transfer;
  from: string;
  to: string;
  value: string;
}

export class ApproveDto extends EventDto {
  eventType = EventType.Approve;
  owner: string;
  spender: string;
  value: string;
}

export class TransactionDto {
  sender: string;
  hash: string;
  gasPrice: string;
  gasLimit: string;
  gasConsumed: string;
  events: EventDto[] = [];
  raw?: any;
}

export class BlockDto {
  blockHeight: number;
  blockHash: string;
  parentHash: string;
  time: Date;
  transactions: TransactionDto[] = [];
  transactionHashes: string[] = [];
  holdersUpdate: HolderUpdateDto[] = [];
}

export class StateUpdateDto {
  incomingBlocks: BlockDto[] = [];
  reversedBlocks: string[] = [];
}
