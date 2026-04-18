/**
 * eConnect 5.0 - Messaging Service
 * Manage messages between parents, teachers, and admins
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType, MessageStatus } from './entities/message.entity';

export interface CreateMessageDto {
  senderId: string;
  recipientId: string;
  studentId?: string;
  subject: string;
  body: string;
  messageType?: MessageType;
  parentMessageId?: string;
  attachments?: string[];
}

export interface UpdateMessageDto {
  subject?: string;
  body?: string;
  status?: MessageStatus;
  isRead?: boolean;
}

export interface GetMessagesQuery {
  userId: string;
  role: 'sender' | 'recipient' | 'all';
  studentId?: string;
  isRead?: boolean;
  messageType?: MessageType;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  /**
   * Send a new message
   */
  async sendMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = this.messageRepository.create({
      ...createMessageDto,
      messageType: createMessageDto.messageType || MessageType.DIRECT,
      status: MessageStatus.SENT,
      isRead: false,
    });
    return await this.messageRepository.save(message);
  }

  /**
   * Get messages for a user
   */
  async getMessages(query: GetMessagesQuery): Promise<{messages: Message[]; total: number}> {
    const {
      userId,
      role,
      studentId,
      isRead,
      messageType,
      limit = 50,
      offset = 0,
    } = query;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('message.student', 'student')
      .orderBy('message.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (role === 'sender') {
      queryBuilder.where('message.sender_id = :userId', { userId });
    } else if (role === 'recipient') {
      queryBuilder.where('message.recipient_id = :userId', { userId });
    } else {
      queryBuilder.where(
        '(message.sender_id = :userId OR message.recipient_id = :userId)',
        { userId },
      );
    }

    if (studentId) {
      queryBuilder.andWhere('message.student_id = :studentId', { studentId });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('message.is_read = :isRead', { isRead });
    }

    if (messageType) {
      queryBuilder.andWhere('message.message_type = :messageType', {
        messageType,
      });
    }

    const [messages, total] = await queryBuilder.getManyAndCount();
    return { messages, total };
  }

  /**
   * Get message by ID
   */
  async getMessageById(id: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'recipient', 'student'],
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    // Check if user has access to this message
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new ForbiddenException('You do not have access to this message');
    }

    return message;
  }

  /**
   * Mark message as read
   */
  async markAsRead(id: string, userId: string): Promise<Message> {
    const message = await this.getMessageById(id, userId);

    // Only recipient can mark as read
    if (message.recipientId !== userId) {
      throw new ForbiddenException('Only recipient can mark message as read');
    }

    message.isRead = true;
    message.readAt = new Date();
    message.status = MessageStatus.READ;

    return await this.messageRepository.save(message);
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string, studentId?: string): Promise<number> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.recipient_id = :userId', { userId })
      .andWhere('message.is_read = :isRead', { isRead: false });

    if (studentId) {
      queryBuilder.andWhere('message.student_id = :studentId', { studentId });
    }

    return await queryBuilder.getCount();
  }

  /**
   * Get conversation thread
   */
  async getConversation(
    userId: string,
    otherUserId: string,
    studentId?: string,
  ): Promise<Message[]> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('message.student', 'student')
      .where(
        '((message.sender_id = :userId AND message.recipient_id = :otherUserId) OR (message.sender_id = :otherUserId AND message.recipient_id = :userId))',
        { userId, otherUserId },
      )
      .orderBy('message.created_at', 'ASC');

    if (studentId) {
      queryBuilder.andWhere('message.student_id = :studentId', { studentId });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string, userId: string): Promise<void> {
    const message = await this.getMessageById(id, userId);

    // Only sender can delete message
    if (message.senderId !== userId) {
      throw new ForbiddenException('Only sender can delete message');
    }

    await this.messageRepository.remove(message);
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    parentMessageId: string,
    userId: string,
    body: string,
  ): Promise<Message> {
    const parentMessage = await this.getMessageById(parentMessageId, userId);

    // Determine recipient (if you're the sender, reply to recipient and vice versa)
    const recipientId =
      parentMessage.senderId === userId
        ? parentMessage.recipientId
        : parentMessage.senderId;

    return await this.sendMessage({
      senderId: userId,
      recipientId,
      studentId: parentMessage.studentId,
      subject: `Re: ${parentMessage.subject}`,
      body,
      parentMessageId,
      messageType: parentMessage.messageType,
    });
  }
}
