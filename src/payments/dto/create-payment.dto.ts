import { IsNotEmpty, IsEnum, IsArray, IsOptional, IsString, IsNumber, ArrayMinSize } from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  STRIPE = 'stripe',
  CARD = 'card',
}

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  orderIds: number[];

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
