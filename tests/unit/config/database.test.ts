import { connectDB } from '../../../src/config/database';
import mongoose from 'mongoose';

jest.mock('mongoose');

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to MongoDB', async () => {
    (mongoose.connect as jest.Mock).mockResolvedValue(mongoose);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalled();
  });

  it('should use connection string from environment', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    (mongoose.connect as jest.Mock).mockResolvedValue(mongoose);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test',
      expect.any(Object)
    );
  });

  it('should handle connection errors', async () => {
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValue(error);

    await expect(connectDB()).rejects.toThrow('Connection failed');
  });

  it('should log successful connection', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (mongoose.connect as jest.Mock).mockResolvedValue(mongoose);

    await connectDB();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should set mongoose options', async () => {
    (mongoose.connect as jest.Mock).mockResolvedValue(mongoose);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
    );
  });
});
