import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { StudentsService } from '../students/students.service';
import { SchedulesService } from '../schedules/schedules.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AcademicRecordsService } from '../academic-records/academic-records.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { PaymentsService } from '../payments/payments.service';
import { HealthService } from '../health/health.service';
import { TransportationService } from '../transportation/transportation.service';
import { SchoolsService } from '../schools/schools.service';
import { Student } from '../students/entities/student.entity';
import { Semester } from '../academic-records/entities/grade.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiApiKey = process.env.GEMINI_API_KEY; // set in .env

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly studentsService: StudentsService,
    private readonly schedulesService: SchedulesService,
    private readonly attendanceService: AttendanceService,
    private readonly academicService: AcademicRecordsService,
    private readonly leaveService: LeaveRequestsService,
    private readonly nutritionService: NutritionService,
    private readonly paymentsService: PaymentsService,
    private readonly healthService: HealthService,
    private readonly transportationService: TransportationService,
    private readonly schoolsService: SchoolsService,
  ) { }

  /** Calls Gemini with streaming response. */
  async askGeminiStream(
    prompt: string,
    userId: string | undefined,
    onChunk: (text: string) => void,
    image?: string,
    mimeType?: string,
  ): Promise<string> {
    if (!this.geminiApiKey) {
      this.logger.error('Gemini API key missing');
      throw new Error('Gemini API key not configured');
    }
    let systemContext = `Bạn là trợ lý AI chuyên gia của hệ thống giáo dục iClever, là một người bạn đồng hành thông minh, thấu hiểu và cực kỳ tận tâm. Nhiệm vụ của bạn là hỗ trợ học sinh và phụ huynh tra cứu thông tin học tập, lịch trình, sức khỏe, và giải đáp mọi thắc mắc về trường học. Hãy trả lời với phong cách hiện đại, sử dụng ngôn ngữ tự nhiên, đôi khi có thể dùng thêm emoji phù hợp 🚀✨. 
QUAN TRỌNG: Tuyệt đối KHÔNG sử dụng mã LaTeX (ví dụ: \\frac, \\cdot, $). Hãy viết công thức toán học bằng ký tự văn bản bình thường (ví dụ: dùng 1/2 thay vì phân số phức tạp, dùng dấu x hoặc * thay vì \\cdot). 
Hãy trình bày rõ ràng, dễ đọc cho học sinh lớp 6,7,8,9.
- PHONG CÁCH: Trò chuyện như một người anh/chị khóa trên cực kỳ thông thái, luôn sẵn sàng giúp đỡ. Hãy sử dụng những câu khích lệ như 'Cố gắng lên nhé!', 'Chúc bạn một ngày học tập thật hiệu quả!',...
- TỰ ĐỘNG PHÂN TÍCH: Nếu thấy điểm số thấp, hãy nhắc nhở ôn tập nhẹ nhàng. Nếu thấy có đơn nghỉ phép, hãy hỏi thăm sức khỏe. Nếu thấy sắp đến giờ học, hãy nhắc nhở chuẩn bị sách vở.
- KIẾN THỨC: Bạn biết rõ mọi thông tin về iClever - nền tảng kết nối nhà trường và gia đình hàng đầu. Bạn có thể giúp tra cứu điểm, xem menu canteen, theo dõi xe bus, và cả trò chuyện giải trí sau giờ học.
`;


    if (userId) {
      try {
        const student = (await this.studentsService.findByUserId(userId)) as Student;
        if (student) {
          systemContext += `\n- HỌC SINH: ${student.lastName} ${student.firstName} (Mã: ${student.studentCode})`;
          systemContext += `\n- LỚP: ${student.currentClass?.name || 'Chưa rõ'}`;

          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          // 1. FULL WEEK TIMETABLE
          if (student.currentClassId && student.currentClass) {
            const academicYearId = student.currentClass.academicYearId;
            try {
              const timetableData = await this.schedulesService.getClassTimetable(student.currentClassId, academicYearId, Semester.SEMESTER_1);
              const fullTimetable = timetableData.timetable;
              let timetableSummary = '';

              const dayNames = {
                monday: 'Thứ Hai',
                tuesday: 'Thứ Ba',
                wednesday: 'Thứ Tư',
                thursday: 'Thứ Năm',
                friday: 'Thứ Sáu',
                saturday: 'Thứ Bảy',
                sunday: 'Chủ Nhật'
              };

              for (const [dayKey, dayName] of Object.entries(dayNames)) {
                if (fullTimetable[dayKey]?.length > 0) {
                  const lessons = fullTimetable[dayKey].map((s: any) => `${s.subjectName} (${s.teacherName || 'Gv chưa rõ'})`).join(', ');
                  timetableSummary += `\n+ ${dayName}: ${lessons}`;
                }
              }

              if (timetableSummary) {
                systemContext += `\n- THỜI KHÓA BIỂU CẢ TUẦN:${timetableSummary}`;
              }
            } catch (e) { }
          // 9. SCHOOL INFO
          try {
            const school = await this.schoolsService.findOneSchool(student.schoolId);
            if (school) {
              systemContext += `
- TRƯỜNG: ${school.name} (Địa chỉ: ${school.address || 'Chưa cập nhật'})`;
            }
          } catch (e) { }
          }

          // 2. ATTENDANCE
          try {
            const attendance = await this.attendanceService.findAll({ studentId: student.id, startDate: todayStr, endDate: todayStr });
            if (attendance.data.length > 0) {
              const status = attendance.data.map(a => `${a.session === 'MORNING' ? 'Sáng' : 'Chiều'}: ${a.status}`).join(', ');
              systemContext += `\n- ĐIỂM DANH HÔM NAY: ${status}`;
            }
          } catch (e) { }

          // 3. GRADES (RECENT)
          try {
            const grades = await this.academicService.findAll({ studentId: student.id, limit: 5 });
            if (grades.data.length > 0) {
              const recentGrades = grades.data.map(g => `${g.subject?.name}: ${g.score}`).join(', ');
              systemContext += `\n- ĐIỂM SỐ GẦN ĐÂY: ${recentGrades}`;
            }
          } catch (e) { }

          // 4. LEAVE REQUESTS
          try {
            const leaves = await this.leaveService.findAll({ studentId: student.id, status: 'PENDING' });
            if (leaves.length > 0) {
              systemContext += `\n- ĐƠN NGHỈ PHÉP: Bạn đang có ${leaves.length} đơn xin nghỉ đang chờ duyệt.`;
            }
          } catch (e) { }

          // 5. NUTRITION (MENU)
          try {
            const menus = await this.nutritionService.getMenus({ schoolId: student.schoolId, date: todayStr });
            if (menus.length > 0) {
              const dishes = menus.map(m => `${m.mealType}: ${m.dishName}`).join(', ');
              systemContext += `\n- THỰC ĐƠN HÔM NAY: ${dishes}`;
            }
          } catch (e) { }
          // 6. PAYMENTS (INVOICES)
          try {
            const invoicesResult = await this.paymentsService.findInvoices({ studentId: student.id, status: 'pending' as any });

            const unpaidInvoices = invoicesResult.data || [];
            if (unpaidInvoices.length > 0) {
              const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
              systemContext += `
- HỌC PHÍ: Bạn còn ${unpaidInvoices.length} hóa đơn chưa thanh toán. Tổng số tiền: ${totalUnpaid.toLocaleString('vi-VN')} VNĐ.`;
            }
          } catch (e) { }

          // 7. HEALTH INFO
          const health = (student as any).healthInfo;
          if (health) {
            systemContext += `
- SỨC KHỎE: Chiều cao ${health.height || '---'}cm, Cân nặng ${health.weight || '---'}kg. Ghi chú: ${health.importantNote || 'Bình thường'}`;
          }

          // 8. TRANSPORTATION (BUS)
          try {
            const busInfo = await this.transportationService.getStudentBusInfo(student.id);
            if (busInfo && busInfo.driver) {
              const nextStatus = busInfo.schedule && busInfo.schedule.length > 0 ? busInfo.schedule[0].status : 'Đang chờ';
              systemContext += `
- XE ĐƯA ĐÓN: Xe biển số ${busInfo.driver.plate}, Tài xế: ${busInfo.driver.name} (${busInfo.driver.phone}). Trạng thái: ${nextStatus}`;
            }
          } catch (e) { }


          // 9. SCHOOL INFO
          try {
            const school = await this.schoolsService.findOneSchool(student.schoolId);
            if (school) {
              systemContext += `
- TRƯỜNG: ${school.name} (Địa chỉ: ${school.address || 'Chưa cập nhật'})`;
            }
          } catch (e) { }
        }
      } catch (e) {
        this.logger.warn('Could not load full student context for AI');
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${this.geminiApiKey}&alt=sse`;



    const parts: any[] = [{ text: prompt }];
    if (image && mimeType) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: image,
        },
      });
    }

    const body = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemContext }]
      },
      contents: [{ role: 'user', parts: parts }],
    });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      const err = await response.text();
      this.logger.error('Gemini request failed', err);
      throw new Error('Gemini request failed');
    }
    const reader = response.body?.getReader();
    let accumulated = '';
    if (reader) {
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);

        // Handle SSE format: split by newline and parse lines starting with "data: "
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            try {
              const json = JSON.parse(dataStr);
              const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                accumulated += text;
                onChunk(text);
              }
            } catch (e) { }
          }
        }
      }
    }
    return accumulated;
  }

  /** Non‑streaming wrapper */
  async askGemini(
    prompt: string,
    userId?: string,
    image?: string,
    mimeType?: string,
  ): Promise<string> {
    let full = '';
    await this.askGeminiStream(
      prompt,
      userId,
      (c) => (full += c),
      image,
      mimeType,
    );
    return full;
  }

  /** Persist a chat record */
  async saveChat(userId: string, prompt: string, answer: string): Promise<void> {
    const chat = this.chatRepo.create({
      userId,
      prompt,
      answer,
    });
    await this.chatRepo.save(chat);
  }

  /** Retrieve chat history for a user */
  async getHistory(userId: string | undefined, take: number): Promise<ChatMessage[]> {
    return this.chatRepo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
      take,
    });
  }
}
