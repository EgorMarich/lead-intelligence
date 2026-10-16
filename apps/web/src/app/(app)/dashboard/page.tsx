'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Building2, Search, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { getSearchJobs } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import styles from '../app.module.scss';

export default function DashboardPage() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['search-jobs'],
    queryFn: getSearchJobs,
  });

  const totalLeads = jobs.reduce((sum, job) => sum + (job.totalFound || job.processed || 0), 0);
  const running = jobs.filter((j) => j.status === 'RUNNING').length;
  const completed = jobs.filter((j) => j.status === 'COMPLETED').length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>WORKSPACE</div><h1>Обзор</h1><p>Ваш центр управления поиском потенциальных клиентов.</p></div>
        <Link className={styles.primary} href="/searches/new"><Search size={16} /> Новый поиск</Link>
      </header>

      <section className={styles.stats}>
        <div className={styles.stat}><div className={styles.statIcon}><Target size={18} /></div><span>Найдено лидов</span><strong>{totalLeads.toLocaleString('ru-RU')}</strong><small>за текущие поиски</small></div>
        <div className={styles.stat}><div className={styles.statIcon}><Search size={18} /></div><span>Активных поисков</span><strong>{running}</strong><small>выполняются сейчас</small></div>
        <div className={styles.stat}><div className={styles.statIcon}><Building2 size={18} /></div><span>Завершённых</span><strong>{completed}</strong><small>поисковых задач</small></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Последние поиски</h2><p>История ваших поисковых задач</p></div><Link href="/searches">Все поиски <ArrowUpRight size={14} /></Link></div>
        {isLoading ? <div className={styles.empty}>Загрузка…</div> : jobs.length === 0 ? (
          <div className={styles.empty}><Sparkles size={25} /><strong>Первый поиск ещё не запущен</strong><span>Укажите категорию и город — система найдёт подходящие компании.</span><Link className={styles.primary} href="/searches/new">Создать поиск</Link></div>
        ) : (
          <div className={styles.table}>
            {jobs.slice(0, 6).map(job => (
              <Link href={`/searches/${job.id}`} className={styles.row} key={job.id}>
                <div><strong>{job.query || 'Без запроса'}</strong><span>{job.source} · {job.cityId || 'Все города'}</span></div>
                <span>{job.processed}/{job.limit}</span><StatusBadge status={job.status} />
                <span className={styles.rowDate}>{new Date(job.createdAt).toLocaleDateString('ru-RU')}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
