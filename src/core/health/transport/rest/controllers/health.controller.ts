import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { BridgeKafkaHealthIndicator } from '@contexts/nodes/infrastructure/health/bridge-kafka.health-indicator';
import { MqttHealthIndicator } from '@contexts/nodes/infrastructure/health/mqtt.health-indicator';

import { HealthResponseDto } from '../dtos/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly mqtt: MqttHealthIndicator,
    private readonly bridgeKafka: BridgeKafkaHealthIndicator,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe — process is up, no dependency checks',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  check(): HealthResponseDto {
    return this.live();
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe — process is up, no dependency checks',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  live(): HealthResponseDto {
    this.logger.debug('Liveness check called');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary:
      'Readiness probe — verifies the database, MQTT, and bridge Kafka connections',
  })
  ready(): Promise<HealthCheckResult> {
    this.logger.debug('Readiness check called');
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.mqtt.check('mqtt'),
      () => this.bridgeKafka.check('bridgeKafka'),
    ]);
  }
}
