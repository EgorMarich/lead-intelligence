import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { SequencesService } from './sequences.service';
import { AiSalesAutomationService } from './ai-sales-automation.service';
@Controller('sequences') @UseGuards(JwtAuthGuard)
export class SequencesController{constructor(private readonly service:SequencesService,private readonly ai:AiSalesAutomationService,private readonly orgs:CurrentOrganizationService,private readonly auth:AuthorizationService){} private async org(req:any){return this.orgs.getForUser(req.user.sub,req.headers['x-organization-id'])}
@Get() async list(@Req() req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_READ);return{data:await this.service.list(o)}}
@Get('enrollments') async enrollments(@Req() req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_READ);return{data:await this.service.enrollmentsList(o)}}
@Post() async create(@Body() body:any,@Req() req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.create(o,body)}}
@Put(':id') async update(@Param('id')id:string,@Body()body:any,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.update(o,id,body)}}
@Post(':id/ai-preview/:businessId') async aiPreview(@Param('id')id:string,@Param('businessId')businessId:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_READ);const sequence=await this.service.get(o,id);const lead=await this.service.getLeadForAutomation(o,businessId);return{data:await this.ai.decide(o,businessId,lead.id,sequence,0)}}
@Post(':id/activate') async activate(@Param('id')id:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.update(o,id,{status:'ACTIVE'})}}
@Post(':id/pause') async pause(@Param('id')id:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.update(o,id,{status:'PAUSED'})}}
@Post(':id/enroll/:businessId') async enroll(@Param('id')id:string,@Param('businessId')businessId:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.enroll(o,id,businessId)}}
@Post(':id/enroll') async enrollMany(@Param('id')id:string,@Body()body:{businessIds:string[]},@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.enrollMany(o,id,body.businessIds??[])}}
@Post('enrollments/:id/pause') async pauseEnrollment(@Param('id')id:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.pause(o,id)}}
@Post('enrollments/:id/resume') async resumeEnrollment(@Param('id')id:string,@Req()req:any){const o=await this.org(req);await this.auth.requirePermission(req.user.sub,o,Permission.BUSINESS_WRITE);return{data:await this.service.resume(o,id)}}
}
