import { config as dotenv } from 'dotenv';

import * as joi from 'joi';
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
      BLOCK_REQUEST_TX_BATCH: joi.number().default(30)
    },
    {
      stripUnknown: true,
    },
  );
}
