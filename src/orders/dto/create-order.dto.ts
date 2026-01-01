import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderModifierDto {
  @IsInt()
  @IsNotEmpty()
  modifier_group_id: number;

  @IsInt()
  @IsNotEmpty()
  modifier_option_id: number;
}

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  menu_item_id: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderModifierDto)
  modifiers: CreateOrderModifierDto[];
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsInt()
  table_id?: number;
}
