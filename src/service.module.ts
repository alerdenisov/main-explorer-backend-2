import { DynamicModule, Type, ForwardReference, Logger } from '@nestjs/common';

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
      imports: [
        service,
      ],
    };
  }
}
