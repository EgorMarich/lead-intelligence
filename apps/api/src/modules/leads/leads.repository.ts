import { Injectable } from '@nestjs/common';
import { Lead, LeadStatus } from './leads.types';

export interface LeadsRepository {
  findMany(organizationId: string, query?: {
    status?: LeadStatus;
    assigneeId?: string;
    tag?: string;
    minScore?: number;
    search?: string;
  }): Promise<Lead[]>;

  findById(organizationId: string, id: string): Promise<Lead | null>;
  create(lead: Lead): Promise<Lead>;
  update(lead: Lead): Promise<Lead>;
}
