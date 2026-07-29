import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { C31PreventivosService } from './c31-preventivos.service';
import { CreateC31PreventivoDto } from './dto/create-c31-preventivo.dto';
import { UpdateC31PreventivoDto } from './dto/update-c31-preventivo.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('c31-preventivos')
@ApiBearerAuth()
@Controller('c31-preventivos')
export class C31PreventivosController {
  constructor(private readonly c31PreventivosService: C31PreventivosService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() createC31PreventivoDto: CreateC31PreventivoDto) {
    return this.c31PreventivosService.create(createC31PreventivoDto);
  }

  @Get()
  findAll() {
    return this.c31PreventivosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.c31PreventivosService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateC31PreventivoDto: UpdateC31PreventivoDto,
  ) {
    return this.c31PreventivosService.update(+id, updateC31PreventivoDto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.c31PreventivosService.remove(+id);
  }
}
