import { Injectable, Module, Controller } from "@nestjs/common";
import { Repository } from "typeorm";
import { BlockEnity } from "./entities/block.entity";
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferEntity } from "./entities/transfer.entity";
import { HolderEntity, HolderUpdateEntity } from "./entities/holder.entity";
import { TransactionEntity } from "./entities/transaction.entity";

@Injectable()
export class DatabaseService {
    constructor(
        private readonly blocksRepository : Repository<BlockEnity>,
        private readonly transfersRepository : Repository<TransferEntity>,
        private readonly holdersRepository : Repository<HolderEntity>,
        private readonly holdersUpdateRepository : Repository<HolderUpdateEntity>,
        private readonly transactionsRepository : Repository<TransactionEntity>,
    ) {}
}

@Controller('database')
export class DatabaseController {
    
}

@Module({
    controllers: [ DatabaseController ],
    providers: [ DatabaseService ],
    imports: [
        TypeOrmModule.forRoot({
            synchronize: true,
            logging: process.env.DATABASE_VERBOSE,
            type: <any>process.env.DATABASE_TYPE,
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT,
            username: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_DB,
            entities: [__dirname + '/entities/*.entity.ts'],
          })
    ]
})
export class DatabaseModule {

}