import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosCuadernoService } from './prestamos-cuaderno.service';
import { CreatePrestamosCuadernoDto } from './dto/create-prestamos-cuaderno.dto';
import { UpdatePrestamosCuadernoDto } from './dto/update-prestamos-cuaderno.dto';

@Controller('prestamos-cuaderno')
export class PrestamosCuadernoController {
  constructor(
    private readonly prestamosCuadernoService: PrestamosCuadernoService,
  ) {}

  @Post()
  create(@Body() createPrestamosCuadernoDto: CreatePrestamosCuadernoDto) {
    return this.prestamosCuadernoService.create(createPrestamosCuadernoDto);
  }

  @Get()
  findAll() {
    return this.prestamosCuadernoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosCuadernoService.findOne(+id);
  }

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prestamosCuadernoService.remove(+id);
  }
}
