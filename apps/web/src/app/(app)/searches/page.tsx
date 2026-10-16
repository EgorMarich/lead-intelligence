'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { getSearchJobs } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import styles from '../app.module.scss';

export default function SearchesPage() {
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['search-jobs'], queryFn: getSearchJobs });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>DISCOVERY</div><h1>Поисковые задачи</h1><p>Запускайте и отслеживайте сбор потенциальных клиентов.</p></div>
        <Link className={styles.primary} href="/searches/new"><Plus size={16} /> Новый поиск</Link>
      </header>
      <section className={styles.panel}>
        {isLoading ? <div className={styles.empty}>Загрузка…</div> : jobs.length === 0 ? (
          <div className={styles.empty}><Search size={25} /><strong>Поисков пока нет</strong><span>Создайте первую задачу, чтобы начать сбор лидов.</span><Link className={styles.primary} href="/searches/new">Создать поиск</Link></div>
        ) : (
          <div className={styles.table}>
            {jobs.map(job => (
              <Link href={`/searches/${job.id}`} className={styles.row} key={job.id}>
                <div><strong>{job.query || 'Без запроса'}</strong><span>Источник: {job.source}</span></div>
                <span>{job.processed} / {job.limit} · {job.filters?.root?.conditions?.length ?? 0} фильтр(ов)</span><StatusBadge status={job.status} />
                <span className={styles.rowDate}>{new Date(job.createdAt).toLocaleString('ru-RU')}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
