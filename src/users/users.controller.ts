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
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  DeactivateStaffDto,
} from './dto/create-staff.dto';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('staff')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() createStaffDto: CreateStaffDto, @Req() req: any) {
    const currentUserRole = req.user.role;
    return this.usersService.createStaff(createStaffDto, currentUserRole);
  }

  @Get('staff')
  @Roles('admin', 'super_admin')
  async listStaff(@Query('include_inactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.usersService.listStaff(includeInactiveBool);
  }

  @Patch('staff/:id/deactivate')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async deactivateStaff(
    @Param('id') userId: string,
    @Body() deactivateDto?: DeactivateStaffDto,
  ) {
    return this.usersService.deactivateStaff(userId, deactivateDto?.reason);
  }

  @Patch('staff/:id/activate')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async activateStaff(@Param('id') userId: string) {
    return this.usersService.activateStaff(userId);
  }

  @Put('staff/:id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async updateStaff(
    @Param('id') userId: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() req: any,
  ) {
    const currentUserRole = req.user.role;
    return this.usersService.updateStaff(userId, updateStaffDto, currentUserRole);
  }
}
