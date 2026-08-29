import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequirementsService } from './requirements.service.js';

@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  findAll(
    @Query('policyVersionId') policyVersionId?: string,
    @Query('policyId') policyId?: string,
  ) {
    return this.requirementsService.findAll({ policyVersionId, policyId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }
}
