import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';

@Injectable()
export class LibraryService implements OnModuleInit {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.bookRepository.count();
      if (count === 0) {
        await this.seedBooks();
      }
    } catch (error) {
      console.warn('[LibraryService] Table not ready yet, skipping seed.');
    }
  }

  private async seedBooks() {
    const books = [
      {
        title: 'Toán học vui vẻ - Tập 1',
        author: 'Nguyễn Văn A',
        category: 'Sách giáo khoa',
        imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1000&auto=format&fit=crop',
        availability: 'Có sẵn',
        status: 'Sẵn sàng',
        description: 'Cuốn sách giúp bé làm quen với các con số và phép tính cơ bản một cách thú vị qua các hình minh họa sinh động.',
        pages: 120,
        rating: 4.8,
        year: '2023',
      },
      {
        title: 'Doraemon - Tập 1',
        author: 'Fujiko F. Fujio',
        category: 'Truyện tranh',
        imageUrl: 'https://images.unsplash.com/photo-1592492159418-39f319320569?q=80&w=1000&auto=format&fit=crop',
        availability: 'Có sẵn',
        status: 'Sẵn sàng',
        description: 'Hành trình phiêu lưu của chú mèo máy đến từ tương lai và cậu bé hậu đậu Nobita.',
        pages: 180,
        rating: 5.0,
        year: '2022',
      },
      {
        title: 'Khám phá Hệ Mặt Trời',
        author: 'NASA Kids',
        category: 'Khoa học',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop',
        availability: 'Có sẵn',
        status: 'Sẵn sàng',
        description: 'Tìm hiểu về các hành tinh, ngôi sao và những bí ẩn của vũ trụ bao la qua những trang sách đầy màu sắc.',
        pages: 85,
        rating: 4.9,
        year: '2023',
      },
      {
        title: 'Tiếng Anh cho Bé - Chủ đề Động vật',
        author: 'Oxford Kids',
        category: 'Sách giáo khoa',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1000&auto=format&fit=crop',
        availability: 'Có sẵn',
        status: 'Sẵn sàng',
        description: 'Học từ vựng tiếng Anh về thế giới động vật qua các trò chơi và hình ảnh dễ thương.',
        pages: 60,
        rating: 4.7,
        year: '2021',
      },
    ];

    await this.bookRepository.save(books);
  }

  async findAll(category?: string): Promise<Book[]> {
    const where = category ? { category } : {};
    return this.bookRepository.find({ where, order: { title: 'ASC' } });
  }

  async findOne(id: string): Promise<Book> {
    return this.bookRepository.findOne({ where: { id } });
  }

  async borrowBook(id: string): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) return null;
    
    book.availability = 'Đã hết';
    book.status = 'Đang mượn';
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    book.returnDate = nextWeek.toLocaleDateString('vi-VN');
    
    return this.bookRepository.save(book);
  }
}
