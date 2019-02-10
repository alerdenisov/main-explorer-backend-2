import { DynamicModule, Type, ForwardReference, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { TypeormConfig } from 'typeorm-config';

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
      providers: [
        {
          provide: Logger,
          useClass: Logger,
        },
      ],
      imports: [
        TypeOrmModule.forRootAsync({
          useClass: TypeormConfig,
        }),
        service,
      ],
    };
  }
}
