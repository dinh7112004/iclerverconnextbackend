/**
 * eConnect 5.0 - Messaging Controller
 * API endpoints for messaging
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Patch,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MessagingService,
  CreateMessageDto,
  GetMessagesQuery,
} from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * Send a new message
   * POST /messaging/messages
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    const message = await this.messagingService.sendMessage({
      ...createMessageDto,
      senderId: req.user.id,
    });
    return {
      success: true,
      data: message,
      message: 'Message sent successfully',
    };
  }

  /**
   * Get messages for current user
   * GET /messaging/messages?role=all&studentId=xxx&isRead=false
   */
  @Get('messages')
  async getMessages(@Query() query: Partial<GetMessagesQuery>, @Request() req) {
    const result = await this.messagingService.getMessages({
      ...query,
      userId: req.user.id,
      role: query.role || 'all',
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    } as GetMessagesQuery);

    return {
      success: true,
      data: result.messages,
      total: result.total,
      message: 'Messages retrieved successfully',
    };
  }

  /**
   * Get message by ID
   * GET /messaging/messages/:id
   */
  @Get('messages/:id')
  async getMessageById(@Param('id') id: string, @Request() req) {
    const message = await this.messagingService.getMessageById(
      id,
      req.user.id,
    );
    return {
      success: true,
      data: message,
      message: 'Message retrieved successfully',
    };
  }

  /**
   * Mark message as read
   * PATCH /messaging/messages/:id/read
   */
  @Patch('messages/:id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const message = await this.messagingService.markAsRead(id, req.user.id);
    return {
      success: true,
      data: message,
      message: 'Message marked as read',
    };
  }

  /**
   * Get unread count
   * GET /messaging/unread-count?studentId=xxx
   */
  @Get('unread-count')
  async getUnreadCount(@Query('studentId') studentId: string, @Request() req) {
    const count = await this.messagingService.getUnreadCount(
      req.user.id,
      studentId,
    );
    return {
      success: true,
      data: { count },
      message: 'Unread count retrieved successfully',
    };
  }

  /**
   * Get conversation with another user
   * GET /messaging/conversations/:userId?studentId=xxx
   */
  @Get('conversations/:userId')
  async getConversation(
    @Param('userId') otherUserId: string,
    @Query('studentId') studentId: string,
    @Request() req,
  ) {
    const messages = await this.messagingService.getConversation(
      req.user.id,
      otherUserId,
      studentId,
    );
    return {
      success: true,
      data: messages,
      message: 'Conversation retrieved successfully',
    };
  }

  /**
   * Reply to a message
   * POST /messaging/messages/:id/reply
   */
  @Post('messages/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  async replyToMessage(
    @Param('id') parentMessageId: string,
    @Body('body') body: string,
    @Request() req,
  ) {
    const message = await this.messagingService.replyToMessage(
      parentMessageId,
      req.user.id,
      body,
    );
    return {
      success: true,
      data: message,
      message: 'Reply sent successfully',
    };
  }

  /**
   * Delete a message
   * DELETE /messaging/messages/:id
   */
  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id') id: string, @Request() req) {
    await this.messagingService.deleteMessage(id, req.user.id);
  }

  /**
   * Get all conversation threads for current user
   * GET /messaging/threads
   */
  @Get('threads')
  async getThreads(@Request() req) {
    const threads = await this.messagingService.getThreads(req.user.id);
    return {
      success: true,
      data: threads,
      message: 'Threads retrieved successfully',
    };
  }
}
