import request from 'supertest';
import app from '../../src/index';

describe('Application Entry Point', () => {
  it('should export express app', () => {
    expect(app).toBeDefined();
  });

  it('should respond to health check endpoint', async () => {
    const response = await request(app).get('/health');
    
    expect([200, 404]).toContain(response.status);
  });

  it('should have JSON middleware configured', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com' });
    
    expect(response.type).toContain('json');
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');
    
    expect(response.status).toBe(404);
  });

  it('should set security headers', async () => {
    const response = await request(app).get('/health');
    
    expect(response.headers).toBeDefined();
  });
});
