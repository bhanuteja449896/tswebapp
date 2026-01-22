import request from 'supertest';
import app from '../src/app';

describe('User Routes', () => {
  it('should reject unauthenticated access to users endpoint', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
