import {
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let health: jest.Mocked<HealthCheckService>;
  let db: jest.Mocked<TypeOrmHealthIndicator>;

  beforeEach(() => {
    health = {
      check: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;
    db = {
      pingCheck: jest.fn(),
    } as unknown as jest.Mocked<TypeOrmHealthIndicator>;
    controller = new HealthController(health, db);
  });

  describe('check() / live()', () => {
    it('returns status "ok"', () => {
      expect(controller.check().status).toBe('ok');
    });

    it('returns a valid ISO 8601 timestamp', () => {
      const result = controller.live();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('returns exactly the keys [status, timestamp]', () => {
      expect(Object.keys(controller.live()).sort()).toEqual([
        'status',
        'timestamp',
      ]);
    });
  });

  describe('ready()', () => {
    it('delegates to HealthCheckService with a database ping', async () => {
      const result: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      health.check.mockResolvedValue(result);

      const response = await controller.ready();

      expect(health.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(response).toBe(result);
    });
  });
});
