declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'production' | 'development' | 'staging';
    PORT: number;

    DATABASE_TYPE: string;
    DATABASE_USER?: string;
    DATABASE_PASSWORD?: string;
    DATABASE_DB: string;
    DATABASE_HOST: string;
    DATABASE_PORT: number;

    MICROSERVICES_RETRY_ATTEMPTS: number;
    MICROSERVICES_RETRY_DELAYS: number;

    REDIS_URL: string;
    NODE_URL: string;
    CONTRACT_ADDRESS: string;
    FROM_BLOCK: number;
  }
}
