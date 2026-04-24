/**
 * eConnect 5.0 - Messaging Service
 * Manage messages between parents, teachers, and admins
 */

import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';

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
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    console.log('[MessagingService] Initializing messages...');
    // Seed disabled by request to use real data
    /*
    const count = await this.messageRepository.count();
    if (count === 0) {
      console.log('[MessagingService] No messages found, seeding...');
      await this.seedMessages();
    } else {
      console.log(`[MessagingService] Found ${count} messages, skipping seed.`);
    }
    */
  }

  private async seedMessages() {
    const teachers = await this.teacherRepository.find({ relations: ['user'] });
    // Find ALL parents and seed for each of them to ensure the current user has data
    const parents = await this.userRepository.find({ where: { role: UserRole.PARENT } });
    
    console.log(`[MessagingService] Found ${teachers.length} teachers and ${parents.length} parents.`);

    if (teachers.length === 0 || parents.length === 0) {
      console.warn('[MessagingService] Seeding failed: Missing teachers or parents');
      return;
    }

    const teacher = teachers[0];
    
    for (const parent of parents) {
      console.log(`[MessagingService] Seeding messages for parent: ${parent.fullName} (${parent.id})`);
      const messages = [
        {
          senderId: teacher.user.id,
          recipientId: parent.id,
          subject: 'Học tập của Minh Anh',
          body: 'Chào phụ huynh em Minh Anh.',
          created_at: new Date(Date.now() - 3600000 * 2),
        },
        {
          senderId: teacher.user.id,
          recipientId: parent.id,
          subject: 'Học tập của Minh Anh',
          body: 'Em Minh Anh dạo này học tập rất tiến bộ.',
          created_at: new Date(Date.now() - 3600000 * 1.9),
        },
        {
          senderId: parent.id,
          recipientId: teacher.user.id,
          subject: 'Re: Học tập của Minh Anh',
          body: 'Cảm ơn cô ạ. Cháu về nhà cũng rất chịu khó làm bài tập.',
          created_at: new Date(Date.now() - 3600000 * 0.5),
        },
        {
          senderId: teacher.user.id,
          recipientId: parent.id,
          subject: 'Re: Học tập của Minh Anh',
          body: 'Dạ vâng, tôi sẽ lưu ý nhắc nhở cháu thêm ạ.',
          created_at: new Date(),
        }
      ];

      for (const msg of messages) {
        const message = this.messageRepository.create({
          ...msg,
          messageType: MessageType.DIRECT,
          status: MessageStatus.SENT,
          isRead: false,
        });
        await this.messageRepository.save(message);
      }
    }
    console.log('[MessagingService] Seeding complete.');
  }

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
      queryBuilder.andWhere('(message.student_id = :studentId OR message.student_id IS NULL)', { studentId });
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

  /**
   * Get unique conversation threads for a user
   */
  async getThreads(userId: string): Promise<any[]> {
    // This is a simplified version using subqueries or distinct logic
    // For a real app, you might want a separate Threads table or more complex aggregation
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where('message.sender_id = :userId OR message.recipient_id = :userId', { userId })
      .orderBy('message.created_at', 'DESC')
      .getMany();

    const threadsMap = new Map();

    messages.forEach(msg => {
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
      if (!otherUser) return;
      
      if (!threadsMap.has(otherUser.id)) {
        threadsMap.set(otherUser.id, {
          id: otherUser.id,
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      
      if (!msg.isRead && msg.recipientId === userId) {
        const thread = threadsMap.get(otherUser.id);
        thread.unreadCount++;
      }
    });

    return Array.from(threadsMap.values());
  }
}
