import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FilterPrestamosCuadernoDto } from './dto/filter-prestamos-cuaderno.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@ApiTags('prestamos-cuaderno')
@ApiBearerAuth()
@Controller('prestamos-cuaderno')
export class PrestamosCuadernoController {
  constructor(
    private readonly prestamosCuadernoService: PrestamosCuadernoService,
  ) {}

  @Roles('ADMIN', 'REGISTRADOR')
  @Post()
  create(
    @Body() createPrestamosCuadernoDto: CreatePrestamosCuadernoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.prestamosCuadernoService.create(
      createPrestamosCuadernoDto,
      usuario,
    );
  }

  @Get()
  findAll(@Query() query: FilterPrestamosCuadernoDto) {
    return this.prestamosCuadernoService.findAll(query); // Pasa 'query'
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosCuadernoService.findOne(+id);
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamosCuadernoDto: UpdatePrestamosCuadernoDto,
  ) {
    return this.prestamosCuadernoService.update(
      +id,
      updatePrestamosCuadernoDto,
    );
  }

  @Roles('ADMIN', 'REGISTRADOR')
  @Patch(':id/devolver')
  devolver(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosCuadernoService.devolver(id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosCuadernoService.remove(+id);
  }
}
