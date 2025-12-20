import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';

export class ReorderCategoriesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  categoryIds: number[];
}
