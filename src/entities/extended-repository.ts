import { Repository } from 'typeorm';

export class ExtendedRepository<TEntity> extends Repository<TEntity> {}
