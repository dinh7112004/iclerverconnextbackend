import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Grade, GradeType, Semester } from './entities/grade.entity';
import { AcademicSummary } from './entities/academic-summary.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';

@Injectable()
export class AcademicRecordsService {
  constructor(
    @InjectRepository(Grade)
    private gradeRepository: Repository<Grade>,
    @InjectRepository(AcademicSummary)
    private summaryRepository: Repository<AcademicSummary>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createGradeDto: CreateGradeDto, enteredBy: string): Promise<Grade> {
    const grade = this.gradeRepository.create({
      ...createGradeDto,
      enteredBy,
      enteredAt: new Date(),
    });

    return this.gradeRepository.save(grade);
  }

  async bulkCreate(
    bulkGradeDto: BulkGradeDto,
    enteredBy: string,
  ): Promise<{ created: number; updated: number }> {
    const {
      classId,
      schoolId,
      subjectId,
      academicYearId,
      semester,
      gradeType,
      examNumber,
      coefficient,
      examDate,
      grades,
    } = bulkGradeDto;

    let created = 0;
    let updated = 0;

    for (const record of grades) {
      const existing = await this.gradeRepository.findOne({
        where: {
          studentId: record.studentId,
          subjectId,
          academicYearId,
          semester,
          gradeType,
          examNumber,
        },
      });

      if (existing) {
        await this.gradeRepository.update(existing.id, {
          score: record.score,
          comment: record.comment,
          enteredBy,
          enteredAt: new Date(),
        });
        updated++;
      } else {
        await this.gradeRepository.save({
          studentId: record.studentId,
          subjectId,
          classId,
          schoolId,
          academicYearId,
          semester,
          gradeType,
          examNumber,
          score: record.score,
          coefficient,
          comment: record.comment,
          examDate: new Date(examDate),
          enteredBy,
          enteredAt: new Date(),
        });
        created++;
      }
    }

    return { created, updated };
  }

  async findAll(filters: {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    academicYearId?: string;
    semester?: Semester;
    gradeType?: GradeType;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Grade[]; total: number }> {
    const { page = 1, limit = 100, ...rest } = filters;
    const skip = (page - 1) * limit;

    const query = this.gradeRepository.createQueryBuilder('grade');

    if (filters.studentId) {
      query.andWhere('grade.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }

    if (filters.classId) {
      query.andWhere('grade.classId = :classId', { classId: filters.classId });
    }

    if (filters.subjectId) {
      query.andWhere('grade.subjectId = :subjectId', {
        subjectId: filters.subjectId,
      });
    }

    if (filters.academicYearId) {
      query.andWhere('grade.academicYearId = :academicYearId', {
        academicYearId: filters.academicYearId,
      });
    }

    if (filters.semester) {
      query.andWhere('grade.semester = :semester', { semester: filters.semester });
    }

    if (filters.gradeType) {
      query.andWhere('grade.gradeType = :gradeType', {
        gradeType: filters.gradeType,
      });
    }

    if (filters.isPublished !== undefined) {
      query.andWhere('grade.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    query
      .leftJoinAndSelect('grade.student', 'student')
      .leftJoinAndSelect('grade.subject', 'subject')
      .leftJoinAndSelect('grade.class', 'class')
      .leftJoinAndSelect('grade.teacher', 'teacher')
      .orderBy('grade.examDate', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Grade> {
    const grade = await this.gradeRepository.findOne({
      where: { id },
      relations: ['student', 'subject', 'class', 'teacher', 'academicYear'],
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    return grade;
  }

  async update(
    id: string,
    updateGradeDto: UpdateGradeDto,
    enteredBy: string,
  ): Promise<Grade> {
    await this.findOne(id);

    await this.gradeRepository.update(id, {
      ...updateGradeDto,
      enteredBy,
      enteredAt: new Date(),
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.gradeRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }
  }

  async publishGrades(gradeIds: string[]): Promise<{ published: number }> {
    let published = 0;

    for (const id of gradeIds) {
      await this.gradeRepository.update(id, {
        isPublished: true,
        publishedAt: new Date(),
      });
      published++;
    }

    return { published };
  }

  async getStudentGradeReport(
    studentId: string,
    academicYearId: string,
    semester: Semester,
  ): Promise<{
    student: any;
    academicYear: string;
    semester: Semester;
    subjects: any[];
    gpa: number;
  }> {
    const cacheKey = `grade_report_${studentId}_${academicYearId}_${semester}`;
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        console.log(`[AcademicRecords] Returning CACHED report for student ${studentId}`);
        return cached as any;
      }
    } catch (err) {
      console.warn(`[AcademicRecords] Cache lookup failed:`, err.message);
    }

    const grades = await this.gradeRepository.find({
      where: {
        studentId,
        academicYearId,
        semester,
        isPublished: true,
      },
      relations: ['subject', 'student'],
    });

    console.log(`[AcademicRecords] Found ${grades.length} grades for student ${studentId} (Cache MISS)`);

    // Group by subject
    const subjectMap = new Map();

    grades.forEach((grade) => {
      const subjectId = grade.subjectId;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subjectName: grade.subject.name,
          grades: [],
        });
      }
      subjectMap.get(subjectId).grades.push(grade);
    });

    // Calculate average for each subject
    const subjects = Array.from(subjectMap.values()).map((subject) => {
      const gradesByType = subject.grades;
      let totalWeightedScore = 0;
      let totalCoefficient = 0;

      gradesByType.forEach((grade: Grade) => {
        const score = parseFloat(grade.score as any) || 0;
        const coefficient = parseFloat(grade.coefficient as any) || 0;
        totalWeightedScore += score * coefficient;
        totalCoefficient += coefficient;
      });

      const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        grades: gradesByType,
        average: Number(average.toFixed(2)),
      };
    });

    // Calculate GPA
    let totalAverage = 0;
    subjects.forEach((subject) => {
      totalAverage += subject.average;
    });
    const gpa = subjects.length > 0 ? totalAverage / subjects.length : 0;

    const result = {
      student: grades[0]?.student,
      academicYear: academicYearId,
      semester,
      subjects,
      gpa: Number(gpa.toFixed(2)),
    };

    // Save to cache
    try {
      await this.cacheManager.set(cacheKey, result, 600000); // 10 minutes
    } catch (err) {
      console.warn(`[AcademicRecords] Cache save failed:`, err.message);
    }

    return result;
  }

  async getClassGradeReport(
    classId: string,
    subjectId: string,
    academicYearId: string,
    semester: Semester,
  ): Promise<{
    class: string;
    subject: string;
    academicYear: string;
    semester: Semester;
    students: any[];
    statistics: {
      totalStudents: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      excellentCount: number;
      goodCount: number;
      averageCount: number;
      belowAverageCount: number;
    };
  }> {
    const grades = await this.gradeRepository.find({
      where: {
        classId,
        subjectId,
        academicYearId,
        semester,
      },
      relations: ['student', 'subject'],
    });

    // Group by student
    const studentMap = new Map();

    grades.forEach((grade) => {
      const studentId = grade.studentId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName: grade.student.fullName,
          studentCode: grade.student.studentCode,
          grades: [],
        });
      }
      studentMap.get(studentId).grades.push(grade);
    });

    // Calculate average for each student
    const students = Array.from(studentMap.values()).map((student) => {
      const gradesList = student.grades;
      let totalWeightedScore = 0;
      let totalCoefficient = 0;

      gradesList.forEach((grade: Grade) => {
        const score = parseFloat(grade.score as any) || 0;
        const coefficient = parseFloat(grade.coefficient as any) || 0;
        totalWeightedScore += score * coefficient;
        totalCoefficient += coefficient;
      });

      const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;

      return {
        ...student,
        average: Number(average.toFixed(2)),
      };
    });

    // Calculate statistics
    const scores = students.map((s) => s.average);
    const totalStudents = students.length;
    const averageScore =
      totalStudents > 0
        ? scores.reduce((sum, score) => sum + score, 0) / totalStudents
        : 0;
    const highestScore = totalStudents > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...scores) : 0;

    const excellentCount = scores.filter((s) => s >= 8).length;
    const goodCount = scores.filter((s) => s >= 6.5 && s < 8).length;
    const averageCount = scores.filter((s) => s >= 5 && s < 6.5).length;
    const belowAverageCount = scores.filter((s) => s < 5).length;

    return {
      class: classId,
      subject: subjectId,
      academicYear: academicYearId,
      semester,
      students,
      statistics: {
        totalStudents,
        averageScore: Number(averageScore.toFixed(2)),
        highestScore,
        lowestScore,
        excellentCount,
        goodCount,
        averageCount,
        belowAverageCount,
      },
    };
  }
}
