import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateStaffDto, UpdateStaffDto, DeactivateStaffDto } from './dto/create-staff.dto'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('staff')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() createStaffDto: CreateStaffDto) {
    return this.usersService.createStaff(createStaffDto)
  }

  @Get('staff')
  @Roles('admin')
  async listStaff(@Query('include_inactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true'
    return this.usersService.listStaff(includeInactiveBool)
  }

  @Patch('staff/:id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deactivateStaff(
    @Param('id') userId: string,
    @Body() deactivateDto?: DeactivateStaffDto,
  ) {
    return this.usersService.deactivateStaff(userId, deactivateDto?.reason)
  }

  @Patch('staff/:id/activate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async activateStaff(@Param('id') userId: string) {
    return this.usersService.activateStaff(userId)
  }

  @Put('staff/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async updateStaff(
    @Param('id') userId: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.usersService.updateStaff(userId, updateStaffDto)
  }
}
