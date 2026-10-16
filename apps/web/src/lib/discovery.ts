import { api } from './api';
import type { SearchJob } from './types';
export type DiscoveryOverview = { totals: { businesses:number; leads:number; hot:number; warm:number }; active:{searches:number;crawls:number}; crawl:{totalUrls:number;processedUrls:number;progress:number}; recentSearches:SearchJob[]; recentCrawls:Array<{id:string;status:string;totalUrls:number;processedUrls:number;failedUrls:number;progress:number;createdAt:string}> };
export async function getDiscoveryOverview(){ const {data}=await api.get<{data:DiscoveryOverview}>('/discovery/overview'); return data.data; }
