import { Module } from '@nestjs/common';
import { WebsiteIntelligenceController } from './website-intelligence.controller';
import { WebsiteIntelligenceService } from './website-intelligence.service';
@Module({ controllers:[WebsiteIntelligenceController], providers:[WebsiteIntelligenceService], exports:[WebsiteIntelligenceService] })
export class WebsiteIntelligenceModule {}
