import { api } from './api';
export type LeadStatus='NEW'|'CONTACTED'|'INTERESTED'|'NEGOTIATION'|'CONVERTED'|'LOST';
export type Lead={id:string;companyName:string;website?:string;city?:string;category?:string;phone?:string;email?:string;telegram?:string;vk?:string;score?:number;scoreGrade?:string;status:LeadStatus;assigneeId?:string;tags:string[];notes:string[];activities:Array<{id:string;type:string;createdAt:string;metadata?:Record<string,unknown>}>;createdAt:string;updatedAt:string};
export async function getLeads(params:any={}){const {data}=await api.get<Lead[]>('/leads',{params});return data}
export async function createLead(payload:Partial<Lead>){const {data}=await api.post<Lead>('/leads',payload);return data}
export async function updateLead(id:string,payload:Partial<Lead>){const {data}=await api.put<Lead>(`/leads/${id}`,payload);return data}
