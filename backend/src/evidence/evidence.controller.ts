import { Controller } from '@nestjs/common';
import { EvidenceService } from './evidence.service.js';

// TODO: Evidence endpoints are nested under actions:
// POST /actions/:id/evidence
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}
}
