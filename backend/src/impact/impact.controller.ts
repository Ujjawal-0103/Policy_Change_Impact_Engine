import { Controller, Get, Param } from '@nestjs/common';
import { ImpactService } from './impact.service.js';

// TODO: Implement impact endpoints:
// GET /impacts/:changeId — get impacts for a policy change
@Controller('impacts')
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Get(':changeId')
  getImpacts(@Param('changeId') changeId: string) {
    return this.impactService.getImpacts(changeId);
  }
}
