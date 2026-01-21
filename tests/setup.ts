import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';

let mongod: MongoMemoryServer | undefined;

// Setup before all tests
beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Error setting up test database:', error);
    throw error;
  }
});

// Cleanup after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
    logger.info('Test database disconnected');
  } catch (error) {
    logger.error('Error closing test database:', error);
  }
});

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
