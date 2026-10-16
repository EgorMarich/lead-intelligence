'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Ban, Play, Plus } from 'lucide-react';
import { cancelCrawlJob, createCrawlJob, getCrawlJobs } from '../../../lib/crawl-jobs';
import styles from '../app.module.scss';

export default function CrawlJobsPage() {
  const [urls, setUrls] = useState('');
  const client = useQueryClient();

  const jobs = useQuery({
    queryKey: ['crawl-jobs'],
    queryFn: getCrawlJobs,
    refetchInterval: 4000,
  });

  const create = useMutation({
    mutationFn: () => createCrawlJob(
      urls.split(/\r?\n|,/).map(v => v.trim()).filter(Boolean),
      3,
    ),
    onSuccess: () => {
      setUrls('');
      client.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
  });

  const cancel = useMutation({
    mutationFn: cancelCrawlJob,
    onSuccess: () => client.invalidateQueries({ queryKey: ['crawl-jobs'] }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>CRAWL ENGINE</div>
          <h1>Задачи обхода</h1>
          <p>Массовый анализ сайтов через очередь. В production очередь подключается к Redis/BullMQ.</p>
        </div>
      </header>

      <form className={styles.formPanel} onSubmit={submit}>
        <div className={styles.formSection}>
          <div className={styles.formTitle}>
            <Activity size={18} />
            <div><strong>Новая задача</strong><span>До 5 000 URL за один job</span></div>
          </div>
          <label>URL — по одному на строку
            <textarea
              required
              value={urls}
              onChange={e => setUrls(e.target.value)}
              placeholder={'https://company-1.ru\nhttps://company-2.ru\nhttps://company-3.ru'}
              rows={7}
            />
          </label>
        </div>
        <button className={styles.primary} disabled={create.isPending}>
          <Plus size={15} /> Создать задачу
        </button>
      </form>

      <section className={styles.panel} style={{ marginTop: 18 }}>
        <div className={styles.panelHead}>
          <div><h2>История задач</h2><p>Автоматическое обновление каждые 4 секунды</p></div>
        </div>

        <div className={styles.leads}>
          {jobs.data?.length ? jobs.data.map(job => (
            <div className={styles.lead} key={job.id}>
              <div className={styles.leadMain}>
                <div>
                  <strong>{job.id.slice(0, 8)}</strong>
                  <span>{job.status} · {job.processedUrls}/{job.totalUrls} URL · {job.progress}%</span>
                </div>
              </div>
              {['QUEUED', 'RUNNING'].includes(job.status) && (
                <button className={styles.iconButton} onClick={() => cancel.mutate(job.id)} title="Остановить">
                  <Ban size={16} />
                </button>
              )}
            </div>
          )) : (
            <div className={styles.empty}>Задач пока нет. Создайте первую массовую проверку.</div>
          )}
        </div>
      </section>
    </div>
  );
}
