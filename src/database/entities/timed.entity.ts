import { CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class TimedEnity {
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
}