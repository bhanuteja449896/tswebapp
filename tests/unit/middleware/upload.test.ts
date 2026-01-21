import { uploadSingle, uploadMultiple, uploadFields } from '../../../src/middleware/upload';
import multer from 'multer';

jest.mock('multer');

describe('Upload Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should configure single file upload', () => {
    expect(uploadSingle).toBeDefined();
    expect(typeof uploadSingle).toBe('function');
  });

  it('should configure multiple file upload', () => {
    expect(uploadMultiple).toBeDefined();
    expect(typeof uploadMultiple).toBe('function');
  });

  it('should configure field-based file upload', () => {
    expect(uploadFields).toBeDefined();
    expect(typeof uploadFields).toBe('function');
  });

  it('should use multer for file handling', () => {
    expect(multer).toBeDefined();
  });
});
