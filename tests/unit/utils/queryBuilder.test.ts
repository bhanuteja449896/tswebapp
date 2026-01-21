import { QueryBuilder } from '../../../src/utils/queryBuilder';

describe('QueryBuilder', () => {
  let builder: QueryBuilder;

  beforeEach(() => {
    builder = new QueryBuilder();
  });

  describe('addFilter', () => {
    it('should add single filter', () => {
      builder.addFilter('status', 'active');
      const query = builder.build();
      
      expect(query.status).toBe('active');
    });

    it('should add multiple filters', () => {
      builder.addFilter('status', 'active');
      builder.addFilter('priority', 'high');
      const query = builder.build();
      
      expect(query.status).toBe('active');
      expect(query.priority).toBe('high');
    });

    it('should handle array values', () => {
      builder.addFilter('tags', ['tag1', 'tag2']);
      const query = builder.build();
      
      expect(query.tags).toEqual({ $in: ['tag1', 'tag2'] });
    });
  });

  describe('addSort', () => {
    it('should add ascending sort', () => {
      builder.addSort('createdAt', 'asc');
      const query = builder.build();
      
      expect(query.sort).toEqual({ createdAt: 1 });
    });

    it('should add descending sort', () => {
      builder.addSort('createdAt', 'desc');
      const query = builder.build();
      
      expect(query.sort).toEqual({ createdAt: -1 });
    });

    it('should handle multiple sort fields', () => {
      builder.addSort('priority', 'desc');
      builder.addSort('createdAt', 'asc');
      const query = builder.build();
      
      expect(query.sort.priority).toBe(-1);
      expect(query.sort.createdAt).toBe(1);
    });
  });

  describe('addPagination', () => {
    it('should add pagination', () => {
      builder.addPagination(2, 20);
      const query = builder.build();
      
      expect(query.skip).toBe(20);
      expect(query.limit).toBe(20);
    });

    it('should calculate skip correctly', () => {
      builder.addPagination(3, 10);
      const query = builder.build();
      
      expect(query.skip).toBe(20);
    });

    it('should use default values', () => {
      builder.addPagination();
      const query = builder.build();
      
      expect(query.skip).toBe(0);
      expect(query.limit).toBeDefined();
    });
  });

  describe('addSearch', () => {
    it('should add text search', () => {
      builder.addSearch('test query', ['title', 'description']);
      const query = builder.build();
      
      expect(query.$or).toBeDefined();
      expect(query.$or.length).toBe(2);
    });

    it('should create case-insensitive regex', () => {
      builder.addSearch('test', ['title']);
      const query = builder.build();
      
      expect(query.$or[0].title).toEqual(expect.objectContaining({
        $regex: expect.any(RegExp),
      }));
    });
  });

  describe('addDateRange', () => {
    it('should add date range filter', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      
      builder.addDateRange('createdAt', start, end);
      const query = builder.build();
      
      expect(query.createdAt.$gte).toEqual(start);
      expect(query.createdAt.$lte).toEqual(end);
    });

    it('should handle only start date', () => {
      const start = new Date('2024-01-01');
      
      builder.addDateRange('createdAt', start);
      const query = builder.build();
      
      expect(query.createdAt.$gte).toEqual(start);
      expect(query.createdAt.$lte).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset builder', () => {
      builder.addFilter('status', 'active');
      builder.addSort('createdAt', 'desc');
      builder.reset();
      
      const query = builder.build();
      
      expect(Object.keys(query).length).toBe(0);
    });
  });

  describe('build', () => {
    it('should build complete query', () => {
      builder.addFilter('status', 'active');
      builder.addSort('createdAt', 'desc');
      builder.addPagination(1, 10);
      
      const query = builder.build();
      
      expect(query.status).toBe('active');
      expect(query.sort).toBeDefined();
      expect(query.skip).toBe(0);
      expect(query.limit).toBe(10);
    });
  });
});
