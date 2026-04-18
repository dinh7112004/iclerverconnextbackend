import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

export interface MathQuestion {
  id: string;
  formula: string;
  answer: number;
  options: number[];
}

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.logger.log('GamesService initialized successfully');
  }

  async generateQuestions(gradeLevel: number): Promise<MathQuestion[]> {
    const questions: MathQuestion[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      questions.push(this.generateOneQuestion(gradeLevel, i));
    }

    return questions;
  }

  private generateOneQuestion(gradeLevel: number, index: number): MathQuestion {
    let num1: number, num2: number, operator: string, answer: number;
    let formula: string;

    // Logic based on Vietnamese Curriculum Grades 6-9
    if (gradeLevel <= 6) {
      // Grade 6: Basic integers up to 100
      const ops = ['+', '-'];
      operator = ops[Math.floor(Math.random() * ops.length)];
      num1 = Math.floor(Math.random() * 50) + 10;
      num2 = Math.floor(Math.random() * 50) + 1;
      
      if (operator === '+') answer = num1 + num2;
      else answer = num1 - num2;
      
      formula = `${num1} ${operator} ${num2}`;
    } else if (gradeLevel === 7) {
      // Grade 7: Integers (including negative)
      const ops = ['+', '-', '*'];
      operator = ops[Math.floor(Math.random() * ops.length)];
      num1 = Math.floor(Math.random() * 40) - 20;
      num2 = Math.floor(Math.random() * 20) + (operator === '*' ? 1 : -10);
      
      if (operator === '+') answer = num1 + num2;
      else if (operator === '-') answer = num1 - num2;
      else answer = num1 * num2;
      
      formula = `(${num1}) ${operator} (${num2})`;
    } else if (gradeLevel === 8) {
      // Grade 8: Simple algebraic substitution or bigger numbers
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      // x^2 - num1 = answer where x = num2
      answer = num2 * num2 - num1;
      formula = `x² - ${num1} (với x = ${num2})`;
    } else {
      // Grade 9: Roots and Linear Equations
      const isRoot = Math.random() > 0.5;
      if (isRoot) {
        num1 = Math.floor(Math.random() * 15) + 1;
        answer = num1;
        formula = `√${num1 * num1}`;
      } else {
        // ax + b = c
        const a = Math.floor(Math.random() * 5) + 2;
        const x = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        const c = a * x + b;
        answer = x;
        formula = `${a}x + ${b} = ${c} (Tìm x)`;
      }
    }

    // Generate 4 options
    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 10) - 5);
      if (!options.includes(wrong) && wrong !== answer) {
        options.push(wrong);
      } else {
         options.push(answer + options.length * 2); // Fallback
      }
    }

    return {
      id: `q-${gradeLevel}-${index}`,
      formula,
      answer,
      options: options.sort(() => Math.random() - 0.5),
    };
  }

  async finishGame(userId: string, score: number, gameType: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const addedCoins = Math.floor(score / 5);
    const addedPoints = Math.floor(score / 2);

    user.coins += addedCoins;
    user.points += addedPoints;

    await this.userRepository.save(user);

    console.log(`[Game] User ${user.email} finished ${gameType} with score ${score}. Awarded ${addedCoins} coins and ${addedPoints} points.`);

    return {
      success: true,
      data: {
        score,
        addedCoins,
        addedPoints,
        totalCoins: user.coins,
        totalPoints: user.points,
      },
    };
  }
}
