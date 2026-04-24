import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';

@Injectable()
export class SurveysService implements OnModuleInit {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.surveyRepository.count();
      console.log(`[SurveysService] Current survey count: ${count}`);
      if (count === 0) {
        console.log('[SurveysService] Seeding surveys...');
        await this.seedSurveys();
      }
    } catch (error) {
      console.warn('[SurveysService] Table not ready yet, skipping seed.');
    }
  }

  private async seedSurveys() {
    const surveys = [
      {
        title: 'Khảo sát đăng ký BHYT năm học 2023-2024',
        expiryDate: '30/09/2023',
        questions: 5,
        isNew: true,
        status: 'active',
      },
      {
        title: 'Phiếu lấy ý kiến về thực đơn bán trú',
        expiryDate: '15/09/2023',
        questions: 3,
        isNew: true,
        status: 'active',
      },
      {
        title: 'Đánh giá chất lượng bữa ăn trưa tháng 9',
        expiryDate: '25/09/2023',
        questions: 4,
        isNew: true,
        status: 'active',
      },
      {
        title: 'Lấy ý kiến về mẫu đồng phục thể thao mới',
        expiryDate: '20/09/2023',
        questions: 2,
        isNew: true,
        status: 'active',
      },
      {
        title: 'Đăng ký câu lạc bộ ngoại khóa kỳ 1',
        expiryDate: '20/08/2023',
        questions: 4,
        isNew: false,
        status: 'completed',
      },
      {
        title: 'Khảo sát chất lượng xe đưa đón',
        expiryDate: '10/08/2023',
        questions: 10,
        isNew: false,
        status: 'expired',
      },
    ];
    await this.surveyRepository.save(surveys);
  }

  async findAll() {
    const all = await this.surveyRepository.find({ order: { createdAt: 'DESC' } });
    
    return {
      ongoing: all.filter(s => s.status === 'active'),
      history: all.filter(s => s.status !== 'active'),
    };
  }

  async submit(id: string) {
    const survey = await this.surveyRepository.findOne({ where: { id } });
    if (!survey) return null;
    
    survey.status = 'completed';
    survey.isNew = false;
    return this.surveyRepository.save(survey);
  }
}
