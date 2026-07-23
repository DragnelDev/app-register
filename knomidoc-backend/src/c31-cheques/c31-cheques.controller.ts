import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { C31ChequesService } from './c31-cheques.service';
import { CreateC31ChequeDto } from './dto/create-c31-cheque.dto';
import { UpdateC31ChequeDto } from './dto/update-c31-cheque.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('c31-cheques')
@ApiBearerAuth()
@Controller('c31-cheques')
export class C31ChequesController {
  constructor(private readonly c31ChequesService: C31ChequesService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() createC31ChequeDto: CreateC31ChequeDto) {
    return this.c31ChequesService.create(createC31ChequeDto);
  }

  @Get()
  findAll() {
    return this.c31ChequesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.c31ChequesService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateC31ChequeDto: UpdateC31ChequeDto,
  ) {
    return this.c31ChequesService.update(+id, updateC31ChequeDto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.c31ChequesService.remove(+id);
  }
}
