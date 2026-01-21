import { PaginationQuery, FilterQuery } from '../types/express';
import { logger } from './logger';

export class QueryBuilder<T> {
  private filters: any = {};
  private sortOptions: any = { createdAt: -1 };
  private paginationOptions: { skip: number; limit: number } = { skip: 0, limit: 10 };
  private populateFields: string[] = [];
  private selectFields: string | null = null;

  constructor(private query: any) {}

  paginate(pagination: PaginationQuery): this {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    
    this.paginationOptions = {
      skip: (page - 1) * limit,
      limit,
    };

    if (pagination.sortBy) {
      const order = pagination.sortOrder === 'asc' ? 1 : -1;
      this.sortOptions = { [pagination.sortBy]: order };
    }

    return this;
  }

  filter(filterQuery: FilterQuery): this {
    if (filterQuery.search) {
      this.filters.$text = { $search: filterQuery.search };
    }

    if (filterQuery.status) {
      this.filters.status = filterQuery.status;
    }

    if (filterQuery.priority) {
      this.filters.priority = filterQuery.priority;
    }

    if (filterQuery.assignee) {
      this.filters.assignee = filterQuery.assignee;
    }

    if (filterQuery.project) {
      this.filters.project = filterQuery.project;
    }

    if (filterQuery.tags && filterQuery.tags.length > 0) {
      this.filters.tags = { $in: filterQuery.tags };
    }

    if (filterQuery.dateFrom || filterQuery.dateTo) {
      this.filters.createdAt = {};
      if (filterQuery.dateFrom) {
        this.filters.createdAt.$gte = new Date(filterQuery.dateFrom);
      }
      if (filterQuery.dateTo) {
        this.filters.createdAt.$lte = new Date(filterQuery.dateTo);
      }
    }

    return this;
  }

  populate(fields: string | string[]): this {
    this.populateFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  select(fields: string): this {
    this.selectFields = fields;
    return this;
  }

  async execute(): Promise<{ data: T[]; total: number }> {
    try {
      let queryChain = this.query.find(this.filters);

      if (this.selectFields) {
        queryChain = queryChain.select(this.selectFields);
      }

      if (this.populateFields.length > 0) {
        this.populateFields.forEach((field) => {
          queryChain = queryChain.populate(field);
        });
      }

      queryChain = queryChain
        .sort(this.sortOptions)
        .skip(this.paginationOptions.skip)
        .limit(this.paginationOptions.limit);

      const [data, total] = await Promise.all([
        queryChain.exec(),
        this.query.countDocuments(this.filters),
      ]);

      return { data, total };
    } catch (error) {
      logger.error('QueryBuilder execution error:', error);
      throw error;
    }
  }

  getFilters() {
    return this.filters;
  }
}

export const buildQuery = <T>(model: any): QueryBuilder<T> => {
  return new QueryBuilder<T>(model);
};
