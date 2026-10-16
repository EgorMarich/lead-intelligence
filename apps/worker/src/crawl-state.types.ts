export type CrawlStatus = 'QUEUED'|'RUNNING'|'COMPLETED'|'CANCELLED'|'FAILED';
export type CrawlUrlStatus = 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';
export type CrawlState = {
  id:string; organizationId:string; status:CrawlStatus; createdAt:string; startedAt?:string; completedAt?:string;
  totalUrls:number; processedUrls:number; failedUrls:number; maxPagesPerSite:number; priority:number;
  urls:Array<{id:string;url:string;status:CrawlUrlStatus;error?:string}>;
  results?:Record<string,unknown>; error?:string;
};
