import { CreateDateColumn, UpdateDateColumn, Column } from "typeorm";
import { Transform } from "class-transformer";

export abstract class TimedEnity {
    @Transform((d: Date | number) => (d instanceof Date ? ~~(d.getTime() / 1000) : new Date(d * 1000)))
    @Column({ nullable: false })
    date: Date;

    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
}