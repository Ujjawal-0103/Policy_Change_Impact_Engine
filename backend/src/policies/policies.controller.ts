import { Controller, Get, Param } from '@nestjs/common';
import { PoliciesService } from './policies.service.js';

// TODO: Implement policy endpoints:
// GET  /policies                    — list policies
// GET  /policies/:id/versions       — list versions
// POST /policies/:id/versions       — create new version
// POST /policies/compare            — compare two versions (AI)
// GET  /policies/:id/changes        — get detected changes
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  findAll() {
    return this.policiesService.findAll();
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.policiesService.getVersions(id);
  }
}
