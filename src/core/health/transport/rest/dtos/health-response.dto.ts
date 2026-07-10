import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  timestamp!: string;
}
