import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { C31BeneficiariosService } from './c31-beneficiarios.service';
import { CreateC31BeneficiarioDto } from './dto/create-c31-beneficiario.dto';
import { UpdateC31BeneficiarioDto } from './dto/update-c31-beneficiario.dto';

@Controller('c31-beneficiarios')
export class C31BeneficiariosController {
  constructor(
    private readonly c31BeneficiariosService: C31BeneficiariosService,
  ) {}

  @Post()
  create(@Body() createC31BeneficiarioDto: CreateC31BeneficiarioDto) {
    return this.c31BeneficiariosService.create(createC31BeneficiarioDto);
  }

  @Get()
  findAll() {
    return this.c31BeneficiariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.c31BeneficiariosService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateC31BeneficiarioDto: UpdateC31BeneficiarioDto,
  ) {
    return this.c31BeneficiariosService.update(+id, updateC31BeneficiarioDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.c31BeneficiariosService.remove(+id);
  }
}
