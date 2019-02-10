import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { setupEnvironment } from 'env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ServiceModule } from 'service.module';
import { Type, DynamicModule, ForwardReference } from '@nestjs/common';
import { TypeormConfig } from 'typeorm-config';
import packageJson = require('../package.json');
import { ApiModule } from 'api/api.module';
import { ExporterModule } from 'exporter/exporter.module';

export const services: {
  [service: string]:
    | Type<any>
    | DynamicModule
    | ((args?: string[]) => DynamicModule)
    | ((args?: string[]) => Promise<DynamicModule>)
    | Promise<DynamicModule>;
} = {
  // seedb: (args?: string[]) => DatabaseModule.forRoot(TypeormConfig),
  // merchant: MerchantsModule,
  // blockchain: (args?: string[]) =>
  //   BlockchainModule.forRoot(args[args.length - 2]),
  exporter: ExporterModule,
  api: ApiModule,
  // notification: NotificationModule,
};

function isConstructor<T>(f: Function | Type<T>): f is Type<T> {
  try {
    new new Proxy(<any>f, {
      construct() {
        return {};
      },
    })();
    return true;
  } catch (err) {
    return false;
  }
}

export async function bootstrap() {
  const args = Array.from(process.argv);
  const service: string = args[args.length - 1];
  await setupEnvironment();

  if (typeof services[service] !== 'undefined') {
    if (service === 'api') {
      const api = await NestFactory.create(ServiceModule.forRoot(ApiModule));

      api.enableCors({
        origin: '*',
      });

      api.connectMicroservice({
        transport: Transport.REDIS,
        options: {
          url: process.env.REDIS_URL,
          retryAttempts: process.env.MICROSERVICES_RETRY_ATTEMPTS,
          retryDelay: process.env.MICROSERVICES_RETRY_DELAYS,
        },
      });

      const options = new DocumentBuilder()
        .setTitle('Merchant API')
        .setDescription('The Merchant API description')
        .setVersion(packageJson.version)
        .addTag('swagger')
        .build();

      const document = SwaggerModule.createDocument(api, options);
      SwaggerModule.setup('swagger', api, document);

      api.listen(process.env.PORT);
    } else {
      const serviceRef = services[service];
      let module:
        | Type<any>
        | DynamicModule
        | Promise<DynamicModule>
        | ForwardReference;
      if (typeof serviceRef === 'function' && !isConstructor(serviceRef)) {
        module = serviceRef(args);
      } else {
        module = serviceRef;
      }
      const serviceApp = await NestFactory.createMicroservice(
        ServiceModule.forRoot(module),
        {
          transport: Transport.REDIS,
          options: {
            url: process.env.REDIS_URL,
            retryAttempts: process.env.MICROSERVICES_RETRY_ATTEMPTS,
            retryDelay: process.env.MICROSERVICES_RETRY_DELAYS,
          },
        },
      );
      serviceApp.listen(() => console.log(`service ${service} is started`));
    }
  } else {
    throw new Error('unkown service');
  }
}
