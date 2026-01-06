import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessCashPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  paymentId: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
