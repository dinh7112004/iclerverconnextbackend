import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('library')
@Controller('library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('books')
  @ApiOperation({ summary: 'Get all books or books by category' })
  async findAll(@Query('category') category: string) {
    const books = await this.libraryService.findAll(category);
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
    const data = books.map(book => ({
      ...book,
      imageUrl: book.imageUrl ? (book.imageUrl.startsWith('http') ? book.imageUrl : `${baseUrl}${book.imageUrl}`) : null,
    }));
    
    return { data };
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get book details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const book = await this.libraryService.findOne(id);
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    
    if (book && book.imageUrl && !book.imageUrl.startsWith('http')) {
      book.imageUrl = `${baseUrl}${book.imageUrl}`;
    }
    
    return { data: book };
  }

  @Post('books/:id/borrow')
  @ApiOperation({ summary: 'Borrow a book' })
  async borrow(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.libraryService.borrowBook(id);
    return { success: true, data };
  }
}
