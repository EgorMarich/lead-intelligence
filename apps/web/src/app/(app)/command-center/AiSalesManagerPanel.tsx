'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Bot, CheckCircle2, Clock3, RefreshCw, Target } from 'lucide-react';
import { getAiSalesManagerBriefing } from '../../../lib/api';
import styles from '../app.module.scss';
export function AiSalesManagerPanel(){
 const {data,isLoading,isFetching,refetch}=useQuery({queryKey:['ai-sales-manager-briefing'],queryFn:getAiSalesManagerBriefing,refetchInterval:60000});
 if(isLoading)return <section className={styles.commandPanel}><div className={styles.commandPanelHead}><div><h2>AI Sales Manager</h2><span>Собираю ежедневный briefing…</span></div><Bot size={16}/></div><div className={styles.commandEmpty}>Анализ CRM и коммуникаций…</div></section>;
 if(!data)return <section className={styles.commandPanel}><div className={styles.commandEmpty}>Не удалось получить AI briefing.</div></section>;
 const b=data.briefing;
 return <section className={styles.aiManager}>
  <div className={styles.aiManagerHead}><div><div className={styles.eyebrow}>AI SALES MANAGER · {data.provider}</div><h2>{b.headline}</h2><p>{b.summary}</p></div><button className={styles.secondary} onClick={()=>refetch()}><RefreshCw size={14}/> {isFetching?'Обновляю…':'Обновить'}</button></div>
  <div className={styles.aiManagerStats}><div><strong>{data.metrics.hotLeads}</strong><span>горячих</span></div><div><strong>{data.metrics.unansweredReplies}</strong><span>ответов без реакции</span></div><div><strong>{data.metrics.staleLeads}</strong><span>зависших лидов</span></div><div><strong>{data.metrics.activeEnrollments}</strong><span>активных касаний</span></div></div>
  <div className={styles.aiManagerGrid}>
   <div className={styles.aiManagerBlock}><div className={styles.aiManagerBlockHead}><Target size={15}/><strong>Что делать сегодня</strong></div>{b.priorities.length?b.priorities.map((x,i)=><div className={styles.aiPriority} key={`${x.title}-${i}`}><span className={x.priority==='HIGH'?styles.aiPriorityHigh:styles.aiPriorityMedium}>{x.priority}</span><div><strong>{x.title}</strong><p>{x.reason}</p></div></div>):<div className={styles.commandEmpty}>Критичных действий не найдено.</div>}</div>
   <div className={styles.aiManagerBlock}><div className={styles.aiManagerBlockHead}><CheckCircle2 size={15}/><strong>Рекомендация менеджеру</strong></div><div className={styles.aiAdvice}>{b.managerAdvice}</div><div className={styles.aiLists}><div><b>Возможности</b>{b.opportunities.map((x,i)=><span key={i}>• {x}</span>)}</div><div><b>Риски</b>{b.risks.map((x,i)=><span key={i}>• {x}</span>)}</div></div></div>
  </div>
  <div className={styles.aiManagerFooter}><span>Уверенность AI: {Math.round(b.confidence*100)}%</span><span>Обновлено {new Date(data.generatedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div>
  {data.unansweredReplies.length>0&&<div className={styles.aiManagerReplies}><div className={styles.aiManagerBlockHead}><Clock3 size={15}/><strong>Ответы, которые нельзя откладывать</strong></div>{data.unansweredReplies.slice(0,5).map(r=><Link key={r.businessId} href={`/leads/${r.businessId}`} className={styles.aiManagerReply}><div><strong>{r.name}</strong><span>{r.channel} · {new Date(r.createdAt).toLocaleString('ru-RU')}</span></div><p>{r.body}</p></Link>)}</div>}
 </section>;
}
