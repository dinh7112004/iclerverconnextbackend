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
