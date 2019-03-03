import * as joi from 'joi';
import { config } from 'dotenv';
import { ADDRESS_REGEX } from 'validation-rules';
config();

const customJoi = joi.extend((j: any) => ({
  base: j.array(),
  name: 'stringArray',
  coerce: (value: any, state: any, options: any) =>
    value.split ? value.split(',') : value,
}));

export async function setupEnvironment() {
  process.env = await joi.validate(
    <any>process.env,
    {
      NODE_ENV: joi
        .string()
        .valid(['development', 'test', 'production'])
        .default('development'),
      PORT: joi.number().default(3000),

      DATABASE_TYPE: joi.string().default('mysql'),
      DATABASE_USER: joi.string().default('user'),
      DATABASE_PASSWORD: joi.string().default('password'),
      DATABASE_DB: joi.string().default('db'),
      DATABASE_HOST: joi.string().default('localhost'),
      DATABASE_PORT: joi.number().default(3306),

      MICROSERVICES_RETRY_ATTEMPTS: joi.number().default(5),
      MICROSERVICES_RETRY_DELAYS: joi.number().default(3000),

      REDIS_URL: joi.string().default('redis://redis'),
      NODE_URL: joi.string().uri({ allowRelative: false }),
      FROM_BLOCK: joi.number().default(0),
      CONTRACT_ADDRESS: joi.string().regex(ADDRESS_REGEX),

      FORCE_HEAL_TO: joi.number().default(-1),
      HEAL_LOOKUP_DISTANCE: joi.number().default(50), // huge enough to get ANY double spend (cost almost $100 mln to attack in mainnet)
      HEAL_BATCH_SIZE: joi.number().default(250),

      LOOKUP_DISTANCE: joi.number().default(1000),
    },
    {
      stripUnknown: true,
    },
  );
}
