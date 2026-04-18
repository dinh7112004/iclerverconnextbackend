/**
 * eConnect 5.0 - Nutrition Service
 * Manage daily menus and nutrition information
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Menu, MealType } from './entities/menu.entity';

export interface CreateMenuDto {
  schoolId: string;
  date: string;
  mealType: MealType;
  dishName: string;
  description?: string;
  ingredients?: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  allergens?: string[];
  notes?: string;
  imageUrl?: string;
}

export interface UpdateMenuDto {
  dishName?: string;
  description?: string;
  ingredients?: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  allergens?: string[];
  notes?: string;
  imageUrl?: string;
}

export interface GetMenusQuery {
  schoolId: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  mealType?: MealType;
}

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  /**
   * Create a new menu entry
   */
  async createMenu(createMenuDto: CreateMenuDto): Promise<Menu> {
    const menu = this.menuRepository.create(createMenuDto);
    return await this.menuRepository.save(menu);
  }

  /**
   * Get menu entries with filters
   */
  async getMenus(query: GetMenusQuery): Promise<Menu[]> {
    const { schoolId, startDate, endDate, date, mealType } = query;

    const queryBuilder = this.menuRepository
      .createQueryBuilder('menu')
      .where('menu.school_id = :schoolId', { schoolId })
      .orderBy('menu.date', 'ASC')
      .addOrderBy('menu.meal_type', 'ASC');

    if (date) {
      queryBuilder.andWhere('menu.date = :date', { date });
    } else if (startDate && endDate) {
      queryBuilder.andWhere('menu.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (mealType) {
      queryBuilder.andWhere('menu.meal_type = :mealType', { mealType });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get menu by ID
   */
  async getMenuById(id: string): Promise<Menu> {
    const menu = await this.menuRepository.findOne({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }
    return menu;
  }

  /**
   * Update a menu entry
   */
  async updateMenu(id: string, updateMenuDto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.getMenuById(id);
    Object.assign(menu, updateMenuDto);
    return await this.menuRepository.save(menu);
  }

  /**
   * Delete a menu entry
   */
  async deleteMenu(id: string): Promise<void> {
    const menu = await this.getMenuById(id);
    await this.menuRepository.remove(menu);
  }

  /**
   * Get weekly menu for a school
   */
  async getWeeklyMenu(schoolId: string, startDate: string): Promise<Menu[]> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return await this.getMenus({
      schoolId,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
    });
  }

  /**
   * Bulk create menus (useful for weekly planning)
   */
  async bulkCreateMenus(menus: CreateMenuDto[]): Promise<Menu[]> {
    const menuEntities = this.menuRepository.create(menus);
    return await this.menuRepository.save(menuEntities);
  }
}
