'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Activity, ArrowUpRight, Bot, Clock3, Flame, MessageCircle, RefreshCw, Sparkles, Target, Users } from 'lucide-react';
import { getCommandCenterOverview } from '../../../lib/api';
import styles from '../app.module.scss';
import { AiSalesManagerPanel } from './AiSalesManagerPanel';

const actionIcon = (type:string) => type === 'HOT_LEAD' ? Flame : type === 'INBOUND_REPLY' ? MessageCircle : type === 'AI_DECISION' ? Bot : Clock3;

export default function CommandCenterPage(){
  const {data,isLoading,isFetching,refetch}=useQuery({queryKey:['command-center'],queryFn:getCommandCenterOverview,refetchInterval:30000});
  if(isLoading) return <div className={styles.page}><div className={styles.empty}>Загрузка Sales Command Center…</div></div>;
  if(!data) return <div className={styles.page}><div className={styles.empty}>Не удалось загрузить центр продаж.</div></div>;
  return <div className={styles.page}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>SALES COMMAND CENTER</div><h1>Центр продаж</h1><p>Одна точка управления горячими лидами, AI и автоматическими касаниями.</p></div>
      <button className={styles.secondary} onClick={()=>refetch()}><RefreshCw size={14}/> Обновить {isFetching?'…':''}</button>
    </header>

    <AiSalesManagerPanel />

    <section className={styles.commandKpis}>
      <div className={styles.commandKpi}><span>Горячие лиды</span><strong>{data.kpis.hotLeads}</strong><small>интерес / переговоры</small></div>
      <div className={styles.commandKpi}><span>Активные sequences</span><strong>{data.kpis.activeSequences}</strong><small>{data.kpis.activeEnrollments} активных enrollment</small></div>
      <div className={styles.commandKpi}><span>Ответы за 24 часа</span><strong>{data.kpis.repliesToday}</strong><small>требуют внимания</small></div>
      <div className={styles.commandKpi}><span>AI решения</span><strong>{data.kpis.pendingAiDecisions}</strong><small>ожидают проверки</small></div>
      <div className={styles.commandKpi}><span>Pipeline</span><strong>{data.kpis.pipelineValue.toLocaleString('ru-RU')} ₽</strong><small>по горячим лидам</small></div>
      <div className={styles.commandKpi}><span>Обновлено</span><strong>{new Date(data.generatedAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</strong><small>автообновление 30 сек</small></div>
    </section>

    <div className={styles.commandGrid}>
      <section className={styles.commandPanel}><div className={styles.commandPanelHead}><div><h2>Что сделать сейчас</h2><span>Приоритетная очередь действий</span></div><Activity size={16}/></div>
        <div className={styles.actionList}>{data.actions.length===0?<div className={styles.commandEmpty}>Сейчас срочных действий нет. Можно заниматься поиском новых лидов.</div>:data.actions.map((a)=>{const Icon=actionIcon(a.type);return <Link key={`${a.type}-${a.businessId}-${a.messageId??a.decisionId??a.enrollmentId??a.leadId}`} href={`/leads/${a.businessId}`} className={styles.actionItem}><div className={styles.actionIcon}><Icon size={15}/></div><div className={styles.actionMain}><strong>{a.title}</strong><span>{a.description}</span></div><span className={styles.priority}>{a.priority} priority</span></Link>})}</div>
      </section>
      <section className={styles.commandPanel}><div className={styles.commandPanelHead}><div><h2>Горячие лиды</h2><span>Сначала самые перспективные</span></div><Target size={16}/></div>
        <div className={styles.commandRows}>{data.hotLeads.length===0?<div className={styles.commandEmpty}>Горячих лидов пока нет.</div>:data.hotLeads.slice(0,8).map(l=><Link key={l.id} href={`/leads/${l.businessId}`} className={styles.commandRow}><div><strong>{l.business?.name??'Компания'}</strong><span>{l.business?.city??'—'} · {l.status}</span></div><strong className={styles.scoreBig}>{l.score}</strong></Link>)}</div>
      </section>
    </div>

    <div className={styles.commandGrid}>
      <section className={styles.commandPanel}><div className={styles.commandPanelHead}><div><h2>Последние ответы</h2><span>AI Reply Copilot можно открыть в карточке лида</span></div><MessageCircle size={16}/></div>
        <div>{data.recentReplies.length===0?<div className={styles.commandEmpty}>Входящих ответов пока нет.</div>:data.recentReplies.slice(0,8).map(r=><Link key={r.id} href={`/leads/${r.businessId}`} className={styles.reply}><div className={styles.replyTop}><strong>{r.channel}</strong><span>{new Date(r.createdAt).toLocaleString('ru-RU')}</span></div><p>{r.body}</p></Link>)}</div>
      </section>
      <section className={styles.commandPanel}><div className={styles.commandPanelHead}><div><h2>Активные sequences</h2><span>Ближайшие автоматические касания</span></div><Bot size={16}/></div>
        <div className={styles.commandRows}>{data.activeEnrollments.length===0?<div className={styles.commandEmpty}>Активных sequences нет.</div>:data.activeEnrollments.slice(0,8).map(e=><Link key={e.id} href="/sequences" className={styles.commandRow}><div><strong>{e.sequenceName}</strong><span>Шаг {e.currentStep+1} · {e.nextRunAt?new Date(e.nextRunAt).toLocaleString('ru-RU'):'ожидание'}</span></div><Clock3 size={14}/></Link>)}</div>
      </section>
    </div>
  </div>;
}
