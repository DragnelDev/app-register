import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { C31DevengadosService } from './c31-devengados.service';
import { CreateC31DevengadoDto } from './dto/create-c31-devengado.dto';
import { UpdateC31DevengadoDto } from './dto/update-c31-devengado.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('c31-devengados')
@ApiBearerAuth()
@Controller('c31-devengados')
export class C31DevengadosController {
  constructor(private readonly c31DevengadosService: C31DevengadosService) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() createC31DevengadoDto: CreateC31DevengadoDto) {
    return this.c31DevengadosService.create(createC31DevengadoDto);
  }

  @Get()
  findAll() {
    return this.c31DevengadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.c31DevengadosService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateC31DevengadoDto: UpdateC31DevengadoDto,
  ) {
    return this.c31DevengadosService.update(+id, updateC31DevengadoDto);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.c31DevengadosService.remove(+id);
  }
}
