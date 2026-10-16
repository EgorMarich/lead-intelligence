'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Mail, Phone, RefreshCw, Square, Globe } from 'lucide-react';
import { cancelSearch, getDiscoveryOptions, getSearchJob, getSearchLeads } from '../../../../lib/api';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import styles from '../../app.module.scss';

export default function SearchDetailsPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['search-job', params.id],
    queryFn: () => getSearchJob(params.id),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' || query.state.data?.status === 'PENDING'
        ? 2500
        : false,
  });
  const { data: options } = useQuery({ queryKey: ['discovery-options'], queryFn: getDiscoveryOptions });
  const { data: leads = [] } = useQuery({
    queryKey: ['search-leads', params.id],
    queryFn: () => getSearchLeads(params.id),
    refetchInterval: job?.status === 'RUNNING' ? 3000 : false,
  });

  const cancel = useMutation({
    mutationFn: () => cancelSearch(params.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-job', params.id] }),
  });

  if (jobLoading) return <div className={styles.empty}>Загрузка…</div>;
  if (!job) return <div className={styles.empty}>Поиск не найден.</div>;

  const progress = job.limit ? Math.min(100, Math.round((job.processed / job.limit) * 100)) : 0;

  return (
    <div className={styles.page}>
      <Link href="/searches" className={styles.back}><ArrowLeft size={15} /> Все поиски</Link>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>SEARCH JOB</div><h1>{job.query || 'Поисковая задача'}</h1><p>{job.source} · создан {new Date(job.createdAt).toLocaleString('ru-RU')}</p></div>
        <div className={styles.actions}>{job.status === 'RUNNING' && <button className={styles.secondary} onClick={() => cancel.mutate()}><Square size={14} /> Остановить</button>}<StatusBadge status={job.status} /></div>
      </header>

      {job.filters?.root && (
        <section className={styles.filterSummary}>
          <span>Активные фильтры</span>
          <div>{(job.filters.root.conditions ?? []).map((condition: any, index: number) => {
            const field = options?.fields.find(item => item.value === condition.field);
            const op = options?.operators[condition.operator] ?? condition.operator;
            const value = ['isTrue', 'isFalse'].includes(condition.operator) ? '' : ` ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}`;
            return <b key={`${condition.field}-${index}`}>{field?.label ?? condition.field} {op}{value}</b>;
          })}</div>
        </section>
      )}

      <section className={styles.progressPanel}>
        <div className={styles.progressTop}><div><span>Прогресс</span><strong>{job.processed.toLocaleString('ru-RU')} / {job.limit.toLocaleString('ru-RU')}</strong></div><b>{progress}%</b></div>
        <div className={styles.progress}><i style={{ width: `${progress}%` }} /></div>
        <div className={styles.progressMeta}><span>Найдено: {job.totalFound}</span><span>Ошибок: {job.errors}</span>{job.status === 'RUNNING' && <span><RefreshCw size={12} /> обновляется автоматически</span>}</div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Найденные лиды</h2><p>{leads.length} результатов в текущей выборке</p></div></div>
        {leads.length === 0 ? <div className={styles.empty}>Результатов пока нет.</div> : (
          <div className={styles.leads}>
            {leads.map(lead => (
              <div className={styles.lead} key={lead.id}>
                <div className={styles.leadMain}><div className={styles.leadIcon}>{lead.name.slice(0, 1).toUpperCase()}</div><div><strong>{lead.name}</strong><span>{lead.category || 'Компания'}{lead.city ? ` · ${lead.city}` : ''}</span></div></div>
                <div className={styles.leadContacts}>
                  {lead.phone && <span><Phone size={13} />{lead.phone}</span>}
                  {lead.email && <span><Mail size={13} />{lead.email}</span>}
                  {lead.website && <a href={lead.website} target="_blank" rel="noreferrer"><Globe size={13} />Сайт <ExternalLink size={11} /></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
