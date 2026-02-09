/**
 * Wispro Automation Module
 * 
 * NestJS module that provides the Wispro automation service.
 * This module can be imported by other modules that need
 * automation capabilities.
 */
import { Module } from '@nestjs/common';
import { WisproAutomationService } from './wispro-automation.service';

@Module({
  providers: [WisproAutomationService],
  exports: [WisproAutomationService],
})
export class WisproAutomationModule {}

