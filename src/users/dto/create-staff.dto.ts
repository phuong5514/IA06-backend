import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator'

export class CreateStaffDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s-()]+$/, { message: 'Invalid phone number format' })
  phone?: string

  @IsEnum(['admin', 'waiter', 'kitchen'], {
    message: 'Role must be one of: admin, waiter, kitchen',
  })
  role: 'admin' | 'waiter' | 'kitchen'
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s-()]+$/)
  phone?: string

  @IsOptional()
  @IsEnum(['admin', 'waiter', 'kitchen'])
  role?: 'admin' | 'waiter' | 'kitchen'
}

export class DeactivateStaffDto {
  @IsString()
  reason?: string
}
