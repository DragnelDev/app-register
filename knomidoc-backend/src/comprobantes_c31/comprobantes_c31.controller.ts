import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ComprobantesC31Service } from './comprobantes_c31.service';
import { CreateComprobantesC31Dto } from './dto/create-comprobantes_c31.dto';
import { UpdateComprobantesC31Dto } from './dto/update-comprobantes_c31.dto';

@Controller('comprobantes-c31')
export class ComprobantesC31Controller {
  constructor(
    private readonly comprobantesC31Service: ComprobantesC31Service,
  ) {}

  @Post()
  create(@Body() createComprobantesC31Dto: CreateComprobantesC31Dto) {
    return this.comprobantesC31Service.create(createComprobantesC31Dto);
  }

  @Get()
  findAll() {
    return this.comprobantesC31Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprobantesC31Service.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComprobantesC31Dto: UpdateComprobantesC31Dto,
  ) {
    return this.comprobantesC31Service.update(+id, updateComprobantesC31Dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comprobantesC31Service.remove(+id);
  }
}
