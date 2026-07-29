import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { C31CarpetasUbicacionService } from './c31-carpetas-ubicacion.service';
import { CreateC31CarpetasUbicacionDto } from './dto/create-c31-carpetas-ubicacion.dto';
import { UpdateC31CarpetasUbicacionDto } from './dto/update-c31-carpetas-ubicacion.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('c31-carpetas-ubicacion')
@ApiBearerAuth()
@Controller('c31-carpetas-ubicacion')
export class C31CarpetasUbicacionController {
  constructor(
    private readonly c31CarpetasUbicacionService: C31CarpetasUbicacionService,
  ) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(@Body() createC31CarpetasUbicacionDto: CreateC31CarpetasUbicacionDto) {
    return this.c31CarpetasUbicacionService.create(
      createC31CarpetasUbicacionDto,
    );
  }

  @Get()
  findAll() {
    return this.c31CarpetasUbicacionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.c31CarpetasUbicacionService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateC31CarpetasUbicacionDto: UpdateC31CarpetasUbicacionDto,
  ) {
    return this.c31CarpetasUbicacionService.update(
      +id,
      updateC31CarpetasUbicacionDto,
    );
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.c31CarpetasUbicacionService.remove(+id);
  }
}
