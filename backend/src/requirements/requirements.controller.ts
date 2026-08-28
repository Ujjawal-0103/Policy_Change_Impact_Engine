import { Controller, Get, Param } from '@nestjs/common';
import { RequirementsService } from './requirements.service.js';

// TODO: Implement requirements endpoints:
// GET /requirements               — list requirements (filterable by policyVersionId)
// GET /requirements/:id           — get requirement by ID
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  findAll() {
    return this.requirementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }
}
