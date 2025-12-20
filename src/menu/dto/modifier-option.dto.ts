import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModifierOptionDto {
  @IsNumber()
  modifier_group_id: number;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  price_adjustment?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}

export class UpdateModifierOptionDto {
  @IsOptional()
  @IsNumber()
  modifier_group_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  price_adjustment?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}
