import { Transform, Type } from 'class-transformer'
import { IsEmail, IsIn, IsInt, IsNumber, ValidateIf, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'player@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254)
  email!: string

  @ApiProperty({ minLength: 10, maxLength: 64, writeOnly: true })
  @IsString() @Length(10, 64)
  password!: string
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'streetking', minLength: 3, maxLength: 24 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString() @Matches(/^[a-z0-9_]{3,24}$/)
  username!: string
}

export class RunDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Reuse this ID when retrying the same run; prevents duplicate progression.' })
  @ValidateIf((_, value) => value !== undefined) @IsUUID()
  submissionId?: string

  @ApiProperty({ example: 10000 })
  @IsInt() @Min(0) @Max(2_000_000_000)
  score!: number

  @ApiProperty({ example: 1000, description: 'Metres' })
  @IsNumber() @Min(0) @Max(10_000_000)
  distance!: number

  @ApiProperty({ example: 60, description: 'Active driving seconds, excluding pauses' })
  @IsNumber() @Min(0.1) @Max(21600)
  duration!: number

  @ApiProperty({ example: 150, description: 'km/h, including nitro' })
  @IsNumber() @Min(0) @Max(10000)
  maxSpeed!: number

  @ApiPropertyOptional({ description: 'km/h; checked against distance and duration' })
  @ValidateIf((_, value) => value !== undefined) @IsNumber() @Min(0) @Max(10000)
  averageSpeed?: number

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(0) @Max(100000)
  nearMisses = 0

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(0) @Max(100000)
  boostsUsed = 0

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(0) @Max(100000)
  collisions = 0

  @ApiPropertyOptional({ format: 'uuid', description: 'Defaults to Street One. Must be owned.' })
  @ValidateIf((_, value) => value !== undefined) @IsUUID()
  selectedCarId?: string
}

export class PageDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20
}

export class RunsQuery extends PageDto {
  @ApiPropertyOptional({ enum: ['createdAt', 'score', 'distance', 'maxSpeed'], default: 'createdAt' })
  @IsIn(['createdAt', 'score', 'distance', 'maxSpeed'])
  sort: 'createdAt' | 'score' | 'distance' | 'maxSpeed' = 'createdAt'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc'
}

export class LeaderboardQuery extends PageDto {
  @ApiPropertyOptional({ enum: ['score', 'distance', 'speed'], default: 'score' })
  @IsIn(['score', 'distance', 'speed'])
  metric: 'score' | 'distance' | 'speed' = 'score'
}

