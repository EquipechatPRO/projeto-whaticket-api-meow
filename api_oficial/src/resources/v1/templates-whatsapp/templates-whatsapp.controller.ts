import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TemplatesWhatsappService } from './templates-whatsapp.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('v1/templates-whatsapp')
@ApiBearerAuth()
@ApiTags('Templates WhatsApp')
export class TemplatesWhatsappController {
  constructor(private readonly service: TemplatesWhatsappService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Retorna registros do templates' })
  @ApiResponse({
    status: 400,
    description: 'Erro ao encontrar os templates com o Whatsapp Oficial',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna os registros de templates do Whatsapp Oficial',
  })
  findAll(@Param('token') token: string) {
    return this.service.findAll(token);
  }

  @Post(':token')
  @ApiOperation({ summary: 'Cria um novo template no WhatsApp Oficial' })
  @ApiResponse({
    status: 201,
    description: 'Template criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao criar o template',
  })
  create(
    @Param('token') token: string,
    @Body() body: { name: string; language: string; category: string; components: any[] },
  ) {
    return this.service.create(token, body);
  }

  @Delete(':token/:templateName')
  @ApiOperation({ summary: 'Deleta um template do WhatsApp Oficial' })
  @ApiResponse({
    status: 200,
    description: 'Template deletado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao deletar o template',
  })
  remove(
    @Param('token') token: string,
    @Param('templateName') templateName: string,
  ) {
    return this.service.remove(token, templateName);
  }
}
