import { Request } from 'express';

/**
 * Custom validators for request validation
 */

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character',
    };
  }

  return { valid: true };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): {
  valid: boolean;
  message?: string;
} {
  if (username.length < 3 || username.length > 20) {
    return {
      valid: false,
      message: 'Username must be between 3 and 20 characters',
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      message: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Validate date range
 */
export function isValidDateRange(
  startDate: Date,
  endDate: Date
): {
  valid: boolean;
  message?: string;
} {
  if (startDate >= endDate) {
    return {
      valid: false,
      message: 'Start date must be before end date',
    };
  }

  return { valid: true };
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return date > new Date();
}

/**
 * Validate date is not too far in the future
 */
export function isReasonableFutureDate(
  date: Date,
  maxYears: number = 5
): {
  valid: boolean;
  message?: string;
} {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + maxYears);

  if (date > maxDate) {
    return {
      valid: false,
      message: `Date cannot be more than ${maxYears} years in the future`,
    };
  }

  return { valid: true };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page?: number,
  limit?: number
): {
  valid: boolean;
  page: number;
  limit: number;
  message?: string;
} {
  const validatedPage = page && page > 0 ? page : 1;
  const validatedLimit = limit && limit > 0 && limit <= 100 ? limit : 20;

  if (page && page <= 0) {
    return {
      valid: false,
      page: validatedPage,
      limit: validatedLimit,
      message: 'Page must be greater than 0',
    };
  }

  if (limit && (limit <= 0 || limit > 100)) {
    return {
      valid: false,
      page: validatedPage,
      limit: validatedLimit,
      message: 'Limit must be between 1 and 100',
    };
  }

  return { valid: true, page: validatedPage, limit: validatedLimit };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: Express.Multer.File,
  allowedTypes: string[],
  maxSize: number
): {
  valid: boolean;
  message?: string;
} {
  if (!file) {
    return { valid: false, message: 'No file provided' };
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      message: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate array of IDs
 */
export function validateIdArray(
  ids: string[],
  minLength: number = 1,
  maxLength: number = 100
): {
  valid: boolean;
  message?: string;
} {
  if (!Array.isArray(ids)) {
    return { valid: false, message: 'IDs must be an array' };
  }

  if (ids.length < minLength) {
    return {
      valid: false,
      message: `At least ${minLength} ID(s) required`,
    };
  }

  if (ids.length > maxLength) {
    return {
      valid: false,
      message: `Maximum ${maxLength} IDs allowed`,
    };
  }

  for (const id of ids) {
    if (!isValidObjectId(id)) {
      return {
        valid: false,
        message: `Invalid ID format: ${id}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate enum value
 */
export function isValidEnumValue<T extends Record<string, string>>(
  value: string,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value);
}

/**
 * Validate string length
 */
export function validateStringLength(
  str: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'Field'
): {
  valid: boolean;
  message?: string;
} {
  if (str.length < minLength) {
    return {
      valid: false,
      message: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (str.length > maxLength) {
    return {
      valid: false,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate numeric range
 */
export function validateNumberRange(
  num: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): {
  valid: boolean;
  message?: string;
} {
  if (num < min) {
    return {
      valid: false,
      message: `${fieldName} must be at least ${min}`,
    };
  }

  if (num > max) {
    return {
      valid: false,
      message: `${fieldName} must not exceed ${max}`,
    };
  }

  return { valid: true };
}

/**
 * Validate array is not empty
 */
export function isNonEmptyArray<T>(
  arr: T[] | undefined | null
): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Validate JSON string
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate HEX color
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate IP address
 */
export function isValidIpAddress(ip: string): boolean {
  // IPv4
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\s/g, '');

  if (!/^\d+$/.test(sanitized)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate postal code
 */
export function isValidPostalCode(
  postalCode: string,
  country: string = 'US'
): boolean {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    AU: /^\d{4}$/,
  };

  const pattern = patterns[country.toUpperCase()];
  return pattern ? pattern.test(postalCode) : false;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Sanitize input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Validate boolean value
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Validate integer
 */
export function isInteger(value: any): value is number {
  return Number.isInteger(value);
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: any): value is number {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate non-negative integer
 */
export function isNonNegativeInteger(value: any): value is number {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validate decimal number
 */
export function isDecimal(value: any, decimalPlaces?: number): boolean {
  if (typeof value !== 'number') {
    return false;
  }

  if (decimalPlaces !== undefined) {
    const parts = value.toString().split('.');
    if (parts[1] && parts[1].length > decimalPlaces) {
      return false;
    }
  }

  return true;
}

/**
 * Validate array uniqueness
 */
export function hasUniqueElements<T>(array: T[]): boolean {
  return new Set(array).size === array.length;
}

/**
 * Validate required fields in object
 */
export function hasRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): {
  valid: boolean;
  missingFields?: (keyof T)[];
} {
  const missingFields = requiredFields.filter(
    (field) => obj[field] === undefined || obj[field] === null
  );

  if (missingFields.length > 0) {
    return { valid: false, missingFields };
  }

  return { valid: true };
}

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  return timeRegex.test(time);
}

/**
 * Validate ISO date string
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date.toISOString() === dateString;
}

/**
 * Validate base64 string
 */
export function isValidBase64(str: string): boolean {
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(str);
}

/**
 * Validate MAC address
 */
export function isValidMacAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Validate latitude
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude
 */
export function isValidLongitude(lon: number): boolean {
  return typeof lon === 'number' && lon >= -180 && lon <= 180;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(
  lat: number,
  lon: number
): {
  valid: boolean;
  message?: string;
} {
  if (!isValidLatitude(lat)) {
    return {
      valid: false,
      message: 'Latitude must be between -90 and 90',
    };
  }

  if (!isValidLongitude(lon)) {
    return {
      valid: false,
      message: 'Longitude must be between -180 and 180',
    };
  }

  return { valid: true };
}

/**
 * Validate request body size
 */
export function isValidBodySize(
  req: Request,
  maxSize: number
): {
  valid: boolean;
  message?: string;
} {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  if (contentLength > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      message: `Request body size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}
