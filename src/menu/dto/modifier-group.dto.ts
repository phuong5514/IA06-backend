import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, IsNumber } from 'class-validator';

export class CreateModifierGroupDto {
  @IsNumber()
  menu_item_id: number;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(['single', 'multiple'])
  type: 'single' | 'multiple';

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class UpdateModifierGroupDto {
  @IsOptional()
  @IsNumber()
  menu_item_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['single', 'multiple'])
  type?: 'single' | 'multiple';

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}