import { config as dotenv } from 'dotenv';

import * as joi from 'joi';
import { ADDRESS_REGEX } from 'database/commot';
export async function config() {
  dotenv();
  process.env = await joi.validate<NodeJS.ProcessEnv>(
    process.env,
    {
      WEB3_PROVIDER: joi
        .string()
        .valid(['WebsocketProvider', 'HttpProvider', 'IpcProvider'])
        .default('WebsocketProvider'),
      WEB3_URL: joi
        .string()
        .uri({ allowRelative: false })
        .default('http://localhost:8545'),
      THROTTLE: joi.number().default(1000),
      BLOCK_MAX_LOOKUP_DISTANCE: joi.number().default(10),
      BLOCK_REQUEST_TIMEOUT: joi.number().default(5000),
      BLOCK_REQUEST_TX_BATCH: joi.number().default(30),
      BLOCK_TOKEN_ADDRESS: joi.string().regex(ADDRESS_REGEX).default('0x9f0f1Be08591AB7d990faf910B38ed5D60e4D5Bf'),
      BLOCK_FROM_BLOCK: joi.number().positive().default(6294810),

      DATABASE_TYPE: joi.string().default('mysql'),
      DATABASE_USER: joi.string().default('user'),
      DATABASE_PASSWORD: joi.string().default('password'),
      DATABASE_DB: joi.string().default('db'),
      DATABASE_HOST: joi.string().default('localhost'),
      DATABASE_PORT: joi.number().default(3306),
      DATABASE_VERBOSE: joi.boolean().default(true),

      MICROSERVICES_RETRY_ATTEMPTS: joi.number().default(5),
      MICROSERVICES_RETRY_DELAYS: joi.number().default(3000),
      REDIS_URL: joi.string().default('redis://redis'),

      PORT: joi.number().default(4000)
    },
    {
      stripUnknown: true,
    },
  );
}
