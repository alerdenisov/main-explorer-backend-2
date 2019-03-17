import { DynamicModule, Type, ForwardReference, Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

export class ServiceModule {
  static forRoot(
    service:
      | Type<any>
      | DynamicModule
      | Promise<DynamicModule>
      | ForwardReference,
  ): DynamicModule {
    return {
      module: ServiceModule,
      imports: [service]
    };
  }
}
