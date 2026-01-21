import {
  generateRandomString,
  slugify,
  truncateString,
  capitalizeFirst,
  formatBytes,
  calculatePercentage,
  daysDifference,
  isPastDate,
  isFutureDate,
  paginateArray,
  sanitizeHtml,
  deepMerge,
  groupBy,
  validatePasswordStrength,
  generateStrongPassword,
} from '../../../src/utils/helpers';

describe('Helper Functions', () => {
  describe('generateRandomString', () => {
    it('should generate random string of specified length', () => {
      const str = generateRandomString(16);
      expect(str).toHaveLength(32); // hex string is 2x length
    });

    it('should generate different strings each time', () => {
      const str1 = generateRandomString();
      const str2 = generateRandomString();
      expect(str1).not.toBe(str2);
    });
  });

  describe('slugify', () => {
    it('should convert string to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello @#$ World!')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const result = truncateString('This is a long string', 10);
      expect(result).toBe('This is...');
    });

    it('should not truncate short strings', () => {
      const result = truncateString('Short', 10);
      expect(result).toBe('Short');
    });

    it('should use custom suffix', () => {
      const result = truncateString('Long string', 8, '>>>');
      expect(result).toBe('Long>>>');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should not change already capitalized', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should handle decimals', () => {
      expect(formatBytes(1536, 2)).toContain('1.5');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(50, 200)).toBe(25);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should round to specified decimals', () => {
      expect(calculatePercentage(1, 3, 2)).toBe(33.33);
    });
  });

  describe('daysDifference', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-11');
      expect(daysDifference(date1, date2)).toBe(10);
    });

    it('should handle same dates', () => {
      const date = new Date();
      expect(daysDifference(date, date)).toBe(0);
    });
  });

  describe('isPastDate', () => {
    it('should identify past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isPastDate(pastDate)).toBe(true);
    });

    it('should identify current/future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isPastDate(futureDate)).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should identify future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isFutureDate(futureDate)).toBe(true);
    });

    it('should identify past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isFutureDate(pastDate)).toBe(false);
    });
  });

  describe('paginateArray', () => {
    it('should paginate array correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = paginateArray(array, 2, 3);
      
      expect(result.data).toEqual([4, 5, 6]);
      expect(result.page).toBe(2);
      expect(result.total).toBe(10);
      expect(result.pages).toBe(4);
    });

    it('should handle first page', () => {
      const array = [1, 2, 3, 4, 5];
      const result = paginateArray(array, 1, 2);
      
      expect(result.data).toEqual([1, 2]);
    });
  });

  describe('sanitizeHtml', () => {
    it('should sanitize HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });

    it('should escape special characters', () => {
      const input = '& < > " \' /';
      const result = sanitizeHtml(input);
      
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 }, e: 4 };
      
      const result = deepMerge(obj1, obj2);
      
      expect(result.a).toBe(1);
      expect(result.b.c).toBe(2);
      expect(result.b.d).toBe(3);
      expect(result.e).toBe(4);
    });

    it('should handle multiple sources', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const obj3 = { c: 3 };
      
      const result = deepMerge(obj1, obj2, obj3);
      
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const array = [
        { type: 'fruit', name: 'apple' },
        { type: 'fruit', name: 'banana' },
        { type: 'vegetable', name: 'carrot' },
      ];
      
      const result = groupBy(array, 'type');
      
      expect(result.fruit).toHaveLength(2);
      expect(result.vegetable).toHaveLength(1);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('Strong@Pass123');
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check minimum length', () => {
      const result = validatePasswordStrength('Short1!');
      
      expect(result.errors).toContain(expect.stringContaining('8 characters'));
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate password of specified length', () => {
      const password = generateStrongPassword(16);
      expect(password).toHaveLength(16);
    });

    it('should include all character types', () => {
      const password = generateStrongPassword(20);
      
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should generate different passwords', () => {
      const pass1 = generateStrongPassword();
      const pass2 = generateStrongPassword();
      
      expect(pass1).not.toBe(pass2);
    });
  });
});
