import { Controller, Post, Body, UseGuards, Request, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  // Streaming answer via Server‑Sent Events
  @UseGuards(JwtAuthGuard)
  @Post('ask')
  async ask(
    @Body('prompt') prompt: string,
    @Body('image') image: string,
    @Body('mimeType') mimeType: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const userId = req.user?.id?.toString();
    res.setHeader('Content-Type', 'text/event-stream');
    res.flushHeaders();
    let fullAnswer = '';
    try {
      await this.aiService.askGeminiStream(
        prompt,
        userId,
        (chunk) => {
          fullAnswer += chunk;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        },
        image,
        mimeType,
      );
      res.write('event: done\ndata: [DONE]\n\n');
      res.end();
      if (userId) await this.aiService.saveChat(userId, prompt, fullAnswer);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: 'Failed' })}\n\n`);
      res.end();
    }
  }

  // Non‑streaming fallback endpoint
  @UseGuards(JwtAuthGuard)
  @Post('ask/once')
  async askOnce(
    @Body('prompt') prompt: string,
    @Body('image') image: string,
    @Body('mimeType') mimeType: string,
    @Request() req,
  ) {
    const answer = await this.aiService.askGemini(
      prompt,
      req.user?.id?.toString(),
      image,
      mimeType,
    );
    if (req.user?.id) await this.aiService.saveChat(req.user.id.toString(), prompt, answer);
    return { answer };
  }

  // Retrieve chat history for current user
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Query('limit') limit: string = '20', @Request() req) {
    const userId = req.user?.id?.toString();
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    return this.aiService.getHistory(userId, take);
  }
}
