import { IsInt, IsString, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Menu item ID', example: 1 })
  @IsInt()
  menu_item_id: number;

  @ApiProperty({ 
    description: 'Rating from 1 to 5 stars', 
    minimum: 1, 
    maximum: 5,
    example: 5 
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ 
    description: 'Review comment', 
    example: 'Absolutely delicious! The best pasta I\'ve ever had.' 
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AdminRespondToReviewDto {
  @ApiProperty({ 
    description: 'Admin response to the review', 
    example: 'Thank you for your feedback! We\'re glad you enjoyed our pasta.' 
  })
  @IsNotEmpty()
  @IsString()
  admin_response: string;
}

export class GetReviewsQueryDto {
  @ApiPropertyOptional({ description: 'Menu item ID to filter reviews', example: 1 })
  @IsOptional()
  @IsInt()
  menu_item_id?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Sort by field', 
    enum: ['created_at', 'rating'],
    default: 'created_at',
    example: 'created_at' 
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ 
    description: 'Sort order', 
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc' 
  })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';
}
