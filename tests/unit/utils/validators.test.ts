import {
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  isValidUsername,
  isValidUrl,
  isValidPhoneNumber,
  validatePagination,
  isValidEnumValue,
  isValidJson,
  isValidHexColor,
  isValidUUID,
  isValidIpAddress,
  isValidSlug,
  validatePasswordStrength,
} from '../../../src/utils/validators';
import { UserRole } from '../../../src/types';

describe('Validator Functions', () => {
  describe('isValidObjectId', () => {
    it('should validate correct MongoDB ObjectId', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidObjectId('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should validate strong password', () => {
      const result = isStrongPassword('Strong@Pass123');
      expect(result.valid).toBe(true);
    });

    it('should reject short password', () => {
      const result = isStrongPassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should require lowercase letter', () => {
      const result = isStrongPassword('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should require uppercase letter', () => {
      const result = isStrongPassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should require number', () => {
      const result = isStrongPassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should require special character', () => {
      const result = isStrongPassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('special');
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct username', () => {
      const result = isValidUsername('user123');
      expect(result.valid).toBe(true);
    });

    it('should reject short username', () => {
      const result = isValidUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('between 3 and 20');
    });

    it('should reject username with special characters', () => {
      const result = isValidUsername('user@name');
      expect(result.valid).toBe(false);
    });

    it('should allow underscores and hyphens', () => {
      expect(isValidUsername('user_name').valid).toBe(true);
      expect(isValidUsername('user-name').valid).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.domain.co.uk')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('htp://invalid')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate international phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+44 20 7946 0958')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination', () => {
      const result = validatePagination(2, 20);
      expect(result.valid).toBe(true);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should use defaults for invalid values', () => {
      const result = validatePagination(0, 200);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should enforce maximum limit', () => {
      const result = validatePagination(1, 150);
      expect(result.limit).toBe(20);
    });
  });

  describe('isValidEnumValue', () => {
    it('should validate enum values', () => {
      expect(isValidEnumValue('admin', UserRole)).toBe(true);
      expect(isValidEnumValue('user', UserRole)).toBe(true);
    });

    it('should reject invalid enum values', () => {
      expect(isValidEnumValue('invalid', UserRole)).toBe(false);
    });
  });

  describe('isValidJson', () => {
    it('should validate JSON strings', () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson('[1, 2, 3]')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(isValidJson('not json')).toBe(false);
      expect(isValidJson('{invalid}')).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('should validate hex colors', () => {
      expect(isValidHexColor('#FF5733')).toBe(true);
      expect(isValidHexColor('#000')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('FF5733')).toBe(false);
      expect(isValidHexColor('#GG5733')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('550e8400')).toBe(false);
    });
  });

  describe('isValidIpAddress', () => {
    it('should validate IPv4 addresses', () => {
      expect(isValidIpAddress('192.168.1.1')).toBe(true);
      expect(isValidIpAddress('10.0.0.1')).toBe(true);
    });

    it('should validate IPv6 addresses', () => {
      expect(isValidIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      expect(isValidIpAddress('256.1.1.1')).toBe(false);
      expect(isValidIpAddress('invalid')).toBe(false);
    });
  });

  describe('isValidSlug', () => {
    it('should validate URL slugs', () => {
      expect(isValidSlug('my-article-title')).toBe(true);
      expect(isValidSlug('hello-world-123')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(isValidSlug('My Article')).toBe(false);
      expect(isValidSlug('article@2024')).toBe(false);
    });
  });
});
