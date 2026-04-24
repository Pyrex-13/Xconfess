import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { SchemaReadinessHealthIndicator } from './schema-readiness.health';
import { QueueHealthIndicator } from './queue.health';

const UP = (key: string) => ({ [key]: { status: 'up' } });

function makeHealthService(pass: boolean) {
  return {
    check: jest.fn().mockImplementation(async (checks: Array<() => Promise<unknown>>) => {
      if (!pass) throw new Error('unhealthy');
      const results = await Promise.all(checks.map((fn) => fn()));
      return { status: 'ok', details: Object.assign({}, ...results) };
    }),
  };
}

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: ReturnType<typeof makeHealthService>;

  const dbIndicator = { pingCheck: jest.fn().mockResolvedValue(UP('database')) };
  const redisIndicator = { isHealthy: jest.fn().mockResolvedValue(UP('redis')) };
  const schemaIndicator = { isHealthy: jest.fn().mockResolvedValue(UP('schema')) };
  const queueIndicator = { isHealthy: jest.fn().mockResolvedValue(UP('queues')) };

  async function buildController(pass = true) {
    healthService = makeHealthService(pass);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthService },
        { provide: TypeOrmHealthIndicator, useValue: dbIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
        { provide: SchemaReadinessHealthIndicator, useValue: schemaIndicator },
        { provide: QueueHealthIndicator, useValue: queueIndicator },
      ],
    }).compile();

    controller = module.get(HealthController);
  }

  describe('GET /health/live', () => {
    it('returns {status: ok} synchronously without calling any indicator', async () => {
      await buildController();
      const result = controller.liveness();
      expect(result).toEqual({ status: 'ok' });
      expect(healthService.check).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('delegates to HealthCheckService with all four checks', async () => {
      await buildController();
      await controller.readiness();
      expect(healthService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
        ]),
      );
    });

    it('calls all four indicators', async () => {
      await buildController();
      await controller.readiness();
      expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(queueIndicator.isHealthy).toHaveBeenCalledWith('queues');
      expect(schemaIndicator.isHealthy).toHaveBeenCalledWith('schema');
    });
  });

  describe('GET /health (backward-compat alias)', () => {
    it('delegates to HealthCheckService with all four checks', async () => {
      await buildController();
      await controller.check();
      expect(healthService.check).toHaveBeenCalled();
    });

    it('calls all four indicators — same set as /health/ready', async () => {
      await buildController();
      await controller.check();
      expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database');
      expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(queueIndicator.isHealthy).toHaveBeenCalledWith('queues');
      expect(schemaIndicator.isHealthy).toHaveBeenCalledWith('schema');
    });
  });
});
