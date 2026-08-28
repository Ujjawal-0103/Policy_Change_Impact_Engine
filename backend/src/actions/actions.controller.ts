import { Controller, Get, Param } from '@nestjs/common';
import { ActionsService } from './actions.service.js';

// TODO: Implement action endpoints:
// GET   /actions              — list actions
// GET   /actions/:id          — get action by ID
// PATCH /actions/:id/status   — update action status
// PATCH /actions/:id/assign   — assign action to user
// POST  /actions/:id/evidence — upload evidence for action
@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  findAll() {
    return this.actionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actionsService.findOne(id);
  }
}
