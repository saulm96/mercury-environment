import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /health', () => {
  it('returns degraded status when DB is disconnected', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'degraded',
      database: 'disconnected',
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
