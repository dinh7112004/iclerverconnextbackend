/**
 * eConnect 5.0 - Nutrition Service
 * Manage daily menus and nutrition information
 */

import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
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
export class NutritionService implements OnModuleInit {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  async onModuleInit() {
    try {
      // Direct SQL fix for broken image URLs in the database
      // This will fix any entry using the photo-1567306301498-519dde06207b (broken Unsplash ID)
      await this.menuRepository.query(`
        UPDATE menus 
        SET image_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000' 
        WHERE image_url LIKE '%519dde06207b%' OR image_url IS NULL OR image_url = ''
      `);
      console.log('🚀 [NutritionService] DATABASE IMAGE FIX APPLIED SUCCESSFULLY!');
    } catch (e) {
      console.error('❌ [NutritionService] Error fixing database images:', e);
    }
  }

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

  /**
   * Get weekly menu grouped by day for mobile app
   */
  async getGroupedWeeklyMenu(schoolId: string, startDate?: string): Promise<any[]> {
    // Default to 15 days ago for history
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) {
      start.setDate(start.getDate() - 15);
    }
    const startStr = start.toISOString().split('T')[0];
    
    // Only return data up to today
    const realToday = new Date();
    const todayStr = realToday.toISOString().split('T')[0];
    const endStr = todayStr;

    const rawMenus = await this.getMenus({ schoolId, startDate: startStr, endDate: endStr });

    const grouped = rawMenus.reduce((acc, curr) => {
      const dateStr = curr.date.toString();

      // Explicitly skip any dates beyond today
      if (dateStr > todayStr) return acc;

      if (!acc[dateStr]) {
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        acc[dateStr] = {
          date: dateStr.split('-').reverse().join('/'), // DD/MM/YYYY
          dayName: dayNames[dayOfWeek],
          imageUrl: isWeekend 
            ? 'https://images.unsplash.com/photo-1518837697219-45223ed7244a?w=800' 
            : (curr.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'),
          breakfast: isWeekend ? 'Nghỉ học' : '',
          lunch: isWeekend ? 'Nghỉ học' : '',
          snack: isWeekend ? 'Nghỉ học' : '',
        };
      }

      const d = new Date(dateStr);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      if (!isWeekend) {
        if (curr.mealType === MealType.BREAKFAST) acc[dateStr].breakfast = curr.dishName;
        if (curr.mealType === MealType.LUNCH) acc[dateStr].lunch = curr.dishName;
        if (curr.mealType === MealType.AFTERNOON_SNACK) acc[dateStr].snack = curr.dishName;
        
        // Use provided imageUrl if it's not a generic placeholder
        if (curr.imageUrl && !acc[dateStr].imageUrl.includes('photo-1504674900247')) {
            acc[dateStr].imageUrl = curr.imageUrl;
        } else if (curr.imageUrl) {
            acc[dateStr].imageUrl = curr.imageUrl;
        }
      }

      return acc;
    }, {});

    return Object.values(grouped);
  }
}
