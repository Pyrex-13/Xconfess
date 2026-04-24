import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './redis.health';
import { SchemaReadinessHealthIndicator } from './schema-readiness.health';
import { QueueHealthIndicator } from './queue.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly schemaReadiness: SchemaReadinessHealthIndicator,
    private readonly queues: QueueHealthIndicator,
  ) {}

  /**
   * Liveness probe — is the process responsive?
   * No external dependency checks. Safe to call at high frequency from load
   * balancers and Kubernetes. Returning 200 here means only "restart me if
   * this starts failing," not "I'm ready to serve traffic."
   */
  @Get('live')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 while the Node process is responsive. No external dependency checks. ' +
      'Use this for Kubernetes liveness probes and load-balancer keep-alives.',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  liveness() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — are all dependencies available?
   * Checks Postgres, Redis, BullMQ queue workers, and confession-table schema.
   * Returns 503 when any dependency is unavailable so orchestrators can stop
   * routing traffic to this instance.
   */
  @Get('ready')
  @HealthCheck()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks all external dependencies: Postgres ping, Redis ping, BullMQ queue-worker ' +
      'presence, and confession-table schema. Returns 503 with per-check detail when any ' +
      'dependency is unavailable. Use this for Kubernetes readiness probes.',
  })
  @ApiResponse({ status: 200, description: 'All dependencies ready' })
  @ApiResponse({
    status: 503,
    description:
      'One or more dependencies unavailable — see response body for per-check detail',
  })
  readiness() {
    return this.health.check([
      async () => this.db.pingCheck('database'),
      async () => this.redis.isHealthy('redis'),
      async () => this.queues.isHealthy('queues'),
      async () => this.schemaReadiness.isHealthy('schema'),
    ]);
  }

  /**
   * Backward-compatible alias for GET /health/ready.
   * Prefer /health/ready for new integrations.
   */
  @Get()
  @HealthCheck()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Health check (readiness alias)',
    description:
      'Backward-compatible alias for GET /health/ready. Prefer /health/ready for new integrations.',
  })
  @ApiResponse({ status: 200, description: 'All checks passed' })
  @ApiResponse({ status: 503, description: 'One or more checks failed' })
  check() {
    return this.health.check([
      async () => this.db.pingCheck('database'),
      async () => this.redis.isHealthy('redis'),
      async () => this.queues.isHealthy('queues'),
      async () => this.schemaReadiness.isHealthy('schema'),
    ]);
  }
}
