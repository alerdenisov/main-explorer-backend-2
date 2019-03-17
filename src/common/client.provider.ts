import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
  ClientOptions,
} from '@nestjs/microservices';
import { Provider } from '@nestjs/common';

export function getClientOptions(): ClientOptions {
  return {
    transport: Transport.REDIS,
    options: {
      url: process.env.REDIS_URL,
      retryAttempts: process.env.MICROSERVICES_RETRY_ATTEMPTS,
      retryDelay: process.env.MICROSERVICES_RETRY_DELAYS,
    },
  };
}

export const ClientProvider: Provider = {
  provide: ClientProxy,
  useFactory: () => ClientProxyFactory.create(getClientOptions()),
};
