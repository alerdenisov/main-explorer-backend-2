declare namespace NodeJS {
  interface ProcessEnv {
    WEB3_PROVIDER: 'WebsocketProvider' | 'HttpProvider' | 'IpcProvider';
    WEB3_URL: string;
    THROTTLE: number;
    BLOCK_MAX_LOOKUP_DISTANCE: number;
    BLOCK_REQUEST_TIMEOUT: number;
    BLOCK_REQUEST_RECEIPTS_TIMEOUT: number;
    BLOCK_REQUEST_TX_BATCH: number;
    BLOCK_TOKEN_ADDRESS: string;
    BLOCK_FROM_BLOCK: number;
    BLOCK_ANCIENT_BLOCKS: number;

    DATABASE_TYPE: string;
    DATABASE_USER?: string;
    DATABASE_PASSWORD?: string;
    DATABASE_DB: string;
    DATABASE_HOST: string;
    DATABASE_PORT: number;

    MICROSERVICES_RETRY_ATTEMPTS: number;
    MICROSERVICES_RETRY_DELAYS: number;

    REDIS_URL: string;
    DATABASE_VERBOSE: boolean;
    PORT: number;
  }
}
