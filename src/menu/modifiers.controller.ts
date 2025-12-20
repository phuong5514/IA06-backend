import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
} from './dto/modifier-group.dto';
import {
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
} from './dto/modifier-option.dto';

@Controller('menu/modifiers')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  // Modifier Groups
  @Get('groups')
  async findAllGroups() {
    return { groups: await this.modifiersService.findAllGroups() };
  }

  @Get('groups/:id')
  async findOneGroup(@Param('id', ParseIntPipe) id: number) {
    return await this.modifiersService.findOneGroup(id);
  }

  @Post('groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createDto: CreateModifierGroupDto) {
    return await this.modifiersService.createGroup(createDto);
  }

  @Patch('groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return await this.modifiersService.updateGroup(id, updateDto);
  }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id', ParseIntPipe) id: number) {
    await this.modifiersService.deleteGroup(id);
  }

  // Modifier Options
  @Get('options')
  async findAllOptions() {
    return { options: await this.modifiersService.findAllOptions() };
  }

  @Get('options/:id')
  async findOneOption(@Param('id', ParseIntPipe) id: number) {
    return await this.modifiersService.findOneOption(id);
  }

  @Post('options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createOption(@Body() createDto: CreateModifierOptionDto) {
    return await this.modifiersService.createOption(createDto);
  }

  @Patch('options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async updateOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateModifierOptionDto,
  ) {
    return await this.modifiersService.updateOption(id, updateDto);
  }

  @Delete('options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOption(@Param('id', ParseIntPipe) id: number) {
    await this.modifiersService.deleteOption(id);
  }

  // Get groups for a specific menu item
  @Get('items/:itemId/groups')
  async findGroupsByItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return { groups: await this.modifiersService.findGroupsByItem(itemId) };
  }

  // Get options for a specific group
  @Get('groups/:groupId/options')
  async findOptionsByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return { options: await this.modifiersService.findOptionsByGroup(groupId) };
  }
}
