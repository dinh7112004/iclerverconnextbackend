/**
 * eConnect 5.0 - Nutrition Controller
 * API endpoints for menu management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import {
  NutritionService,
  CreateMenuDto,
  UpdateMenuDto,
  GetMenusQuery,
} from './nutrition.service';
import { MealType } from './entities/menu.entity';

@Controller('nutrition')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  /**
   * Create a new menu entry
   * POST /nutrition/menus
   */
  @Post('menus')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async createMenu(@Body() createMenuDto: CreateMenuDto) {
    const menu = await this.nutritionService.createMenu(createMenuDto);
    return {
      success: true,
      data: menu,
      message: 'Menu created successfully',
    };
  }

  /**
   * Get menus with filters
   * GET /nutrition/menus?schoolId=xxx&date=2024-01-15&mealType=LUNCH
   */
  @Get('menus')
  @Roles(
    UserRole.PARENT,
    UserRole.TEACHER,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
  )
  async getMenus(@Query() query: GetMenusQuery) {
    const menus = await this.nutritionService.getMenus(query);
    return {
      success: true,
      data: menus,
      message: 'Menus retrieved successfully',
    };
  }

  /**
   * Get menu by ID
   * GET /nutrition/menus/:id
   */
  @Get('menus/:id')
  @Roles(
    UserRole.PARENT,
    UserRole.TEACHER,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
  )
  async getMenuById(@Param('id') id: string) {
    const menu = await this.nutritionService.getMenuById(id);
    return {
      success: true,
      data: menu,
      message: 'Menu retrieved successfully',
    };
  }

  /**
   * Update a menu entry
   * PUT /nutrition/menus/:id
   */
  @Put('menus/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async updateMenu(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ) {
    const menu = await this.nutritionService.updateMenu(id, updateMenuDto);
    return {
      success: true,
      data: menu,
      message: 'Menu updated successfully',
    };
  }

  /**
   * Delete a menu entry
   * DELETE /nutrition/menus/:id
   */
  @Delete('menus/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMenu(@Param('id') id: string) {
    await this.nutritionService.deleteMenu(id);
  }

  /**
   * Get weekly menu
   * GET /nutrition/menus/weekly/:schoolId?startDate=2024-01-15
   */
  @Get('menus/weekly/:schoolId')
  @Roles(
    UserRole.PARENT,
    UserRole.TEACHER,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
  )
  async getWeeklyMenu(
    @Param('schoolId') schoolId: string,
    @Query('startDate') startDate: string,
  ) {
    const menus = await this.nutritionService.getWeeklyMenu(
      schoolId,
      startDate,
    );
    return {
      success: true,
      data: menus,
      message: 'Weekly menu retrieved successfully',
    };
  }

  /**
   * Bulk create menus
   * POST /nutrition/menus/bulk
   */
  @Post('menus/bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateMenus(@Body() menus: CreateMenuDto[]) {
    const createdMenus = await this.nutritionService.bulkCreateMenus(menus);
    return {
      success: true,
      data: createdMenus,
      message: `${createdMenus.length} menus created successfully`,
    };
  }
}
