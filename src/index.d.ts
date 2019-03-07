declare namespace NodeJS {
    interface ProcessEnv {
        WEB3_PROVIDER: 'WebsocketProvider' | 'HttpProvider' | 'IpcProvider';
        WEB3_URL: string;
        THROTTLE: number; 
        BLOCK_MAX_LOOKUP_DISTANCE: number;
        BLOCK_REQUEST_TIMEOUT: number;
        BLOCK_REQUEST_RECEIPTS_TIMEOUT: number;
        BLOCK_REQUEST_TX_BATCH: number;
    }
  }
  