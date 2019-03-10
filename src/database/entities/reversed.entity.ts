import { Column, Index } from "typeorm";
import { TimedEnity } from "./timed.entity";

export abstract class ReversedEnity extends TimedEnity {
    @Index()
    @Column('boolean', { default: false })
    reversed: boolean;
}