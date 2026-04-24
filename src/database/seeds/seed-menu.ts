import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Menu, MealType } from '../../modules/nutrition/entities/menu.entity';
import { User } from '../../modules/users/entities/user.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { Grade } from '../../modules/schools/entities/grade.entity';
import { AcademicYear } from '../../modules/schools/entities/academic-year.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Parent } from '../../modules/parents/entities/parent.entity';
import { StudentParentRelation } from '../../modules/parents/entities/student-parent-relation.entity';
import { Class } from '../../modules/classes/entities/class.entity';
import { TimeSlot } from '../../modules/schedules/entities/time-slot.entity';
import { Schedule } from '../../modules/schedules/entities/schedule.entity';
import { Grade as GradeRecord } from '../../modules/academic-records/entities/grade.entity';
import { Attendance } from '../../modules/attendance/entities/attendance.entity';
import { AttendanceSummary } from '../../modules/attendance/entities/attendance-summary.entity';

async function seed() {
    console.log('🌱 Starting menu seeding...');

    const AppDataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [
            Menu, User, School, Grade, AcademicYear, Subject, Teacher, Student,
            Parent, StudentParentRelation, Class, TimeSlot, Schedule,
            Attendance, GradeRecord, AttendanceSummary
        ],
        synchronize: false,
    });

    await AppDataSource.initialize();
    const menuRepo = AppDataSource.getRepository(Menu);
    const schoolRepo = AppDataSource.getRepository(School);

    const schools = await schoolRepo.find();
    if (schools.length === 0) {
        console.log('❌ No schools found. Please seed schools first.');
        await AppDataSource.destroy();
        return;
    }

    const schoolId = schools[0].id;
    console.log(`Using School ID: ${schoolId}`);

    // Menu data for Sep 15th as requested (the user's screenshot has Phở bò, etc. for 15/09/2023)
    // Expand target dates to 14 days (7 days ago to 7 days ahead)
    const targetDates = [];
    const today = new Date();
    for (let i = -7; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        targetDates.push(d.toISOString().split('T')[0]);
    }

    const menuItems = [
        {
            breakfast: 'Phở bò tái lăn',
            lunch: 'Cơm trắng, Sườn xào chua ngọt, Canh bí xanh',
            snack: 'Váng sữa Monte',
            imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1000'
        },
        {
            breakfast: 'Bún mọc sườn non',
            lunch: 'Cơm tấm, Chả trứng, Thịt nướng, Dưa góp',
            snack: 'Chè dưỡng nhan',
            imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000'
        },
        {
            breakfast: 'Bánh mì chảo',
            lunch: 'Bún chả Hà Nội, Nem rán, Rau sống',
            snack: 'Sữa tươi TH True Milk',
            imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000'
        },
        {
            breakfast: 'Xôi xéo mỡ hành',
            lunch: 'Cơm, Cá thu sốt cà chua, Rau muống luộc',
            snack: 'Thạch rau câu trái cây',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000'
        },
        {
            breakfast: 'Mì Quảng tôm thịt',
            lunch: 'Cơm, Thịt gà kho sả ớt, Canh cải cúc',
            snack: 'Sữa ngũ cốc',
            imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1000'
        },
        {
            breakfast: 'Bánh cuốn Thanh Trì',
            lunch: 'Cơm, Cá lóc kho tộ, Canh chua Nam Bộ',
            snack: 'Chè bưởi An Giang',
            imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1000'
        },
        {
            breakfast: 'Súp gà ngô non',
            lunch: 'Nui xào bò, Rau củ quả luộc, Trái cây',
            snack: 'Sữa chua dẻo',
            imageUrl: 'https://images.unsplash.com/photo-1529566652340-2c40a2c52cb3?w=1000'
        },
        {
            breakfast: 'Bún thang Hà Nội',
            lunch: 'Cơm, Tôm rim mặn ngọt, Canh rau cải',
            snack: 'Bánh tart trứng',
            imageUrl: 'https://images.unsplash.com/photo-1593504049359-74330189a345?w=1000'
        },
        {
            breakfast: 'Hủ tiếu Nam Vang',
            lunch: 'Cơm, Thịt bò xào thiên lý, Canh cà chua',
            snack: 'Bánh su kem',
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000'
        },
        {
            breakfast: 'Miến lươn trộn',
            lunch: 'Cơm, Đậu phụ nhồi thịt, Canh bí đỏ',
            snack: 'Chè đậu xanh',
            imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000'
        }
    ];

    console.log(`Cleaning existing menus for target dates...`);
    await menuRepo.createQueryBuilder()
        .delete()
        .where('date IN (:...dates)', { dates: targetDates })
        .execute();

    const records = [];
    let menuIndex = 0;
    for (const date of targetDates) {
        // Linear rotation instead of random to ensure day-to-day variety during testing
        const item = menuItems[menuIndex % menuItems.length];
        menuIndex++;
        
        // Breakfast
        records.push({
            schoolId,
            date,
            mealType: MealType.BREAKFAST,
            dishName: item.breakfast,
            imageUrl: item.imageUrl,
        });

        // Lunch
        records.push({
            schoolId,
            date,
            mealType: MealType.LUNCH,
            dishName: item.lunch,
            imageUrl: item.imageUrl,
        });

        // Afternoon Snack
        records.push({
            schoolId,
            date,
            mealType: MealType.AFTERNOON_SNACK,
            dishName: item.snack,
            imageUrl: item.imageUrl,
        });
    }

    await menuRepo.save(records);
    console.log(`✅ Seeded ${records.length} menu records for ${targetDates.length} days.`);

    await AppDataSource.destroy();
}

seed().catch(console.error);
