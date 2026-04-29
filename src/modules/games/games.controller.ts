import { Controller, Get, Post, Body, Query, UseGuards, Req, Version, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Games')
@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('math-rush/questions')
  @Version('1')
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi toán học theo khối lớp' })
  async getMathRushQuestions(@Query('gradeLevel') gradeLevel: string) {
    const level = parseInt(gradeLevel) || 6;
    const questions = await this.gamesService.generateQuestions(level);
    return { success: true, data: questions };
  }

  @Post('start')
  @Version('1')
  @ApiOperation({ summary: 'Bắt đầu game và trừ xu' })
  async startGame(
    @Body() body: { gameType: string; cost: number },
    @Req() req: any
  ) {
    const userId = req.user.id;
    return this.gamesService.startGame(userId, body.gameType, body.cost);
  }

  @Post('finish')
  @Version('1')
  @ApiOperation({ summary: 'Ghi nhận kết quả chơi game và nhận thưởng' })
  async finishGame(
    @Body() body: { score: number; gameType: string },
    @Req() req: any
  ) {
    const userId = req.user.id;
    return this.gamesService.finishGame(userId, body.score, body.gameType);
  }
}
