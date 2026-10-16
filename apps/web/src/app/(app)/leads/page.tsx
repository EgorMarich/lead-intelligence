'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Filter, Flame, Search, Star } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { getQualifiedLeads } from '../../../lib/api';
import styles from '../app.module.scss';

export default function LeadsPage() {
  const [city, setCity] = useState('');
  const [minScore, setMinScore] = useState('');
  const [grade, setGrade] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['qualified-leads', city, minScore, grade],
    queryFn: () => getQualifiedLeads({ city: city || undefined, minScore: minScore ? Number(minScore) : undefined, grade: grade || undefined, limit: 100 }),
  });
  const leads = data?.data ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>LEAD INTELLIGENCE</div><h1>Квалифицированные лиды</h1><p>Компании, которые система уже обогатила и оценила.</p></div>
      </header>
      <section className={styles.filters}>
        <div className={styles.filterIcon}><Filter size={15}/></div>
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Город" />
        <select value={grade} onChange={e => setGrade(e.target.value)}><option value="">Любой grade</option><option value="HOT">HOT</option><option value="WARM">WARM</option><option value="COLD">COLD</option><option value="LOW">LOW</option></select>
        <select value={minScore} onChange={e => setMinScore(e.target.value)}><option value="">Любой score</option><option value="40">40+</option><option value="60">60+</option><option value="70">70+</option><option value="90">90+</option></select>
      </section>
      <section className={styles.panel}>
        {isLoading ? <div className={styles.empty}>Анализируем лиды…</div> : leads.length === 0 ? <div className={styles.empty}><Building2 size={25}/><strong>Подходящих лидов пока нет</strong><span>Запустите поиск — после сбора компании автоматически попадут сюда.</span></div> : (
          <div className={styles.leads}>
            {leads.map(({ business, score }) => (
              <div className={styles.lead} key={business.id}>
                <div className={styles.leadMain}><div className={styles.leadIcon}>{business.name.slice(0,1).toUpperCase()}</div><div><Link href={`/leads/${business.id}`}><strong>{business.name}</strong></Link><span>{business.city}{business.address ? ` · ${business.address}` : ''}</span></div></div>
                <div className={styles.leadScore}>{score ? <><span className={styles.score}><Flame size={13}/>{score.score}</span><b className={`${styles.grade} ${styles[score.grade]}`}>{score.grade}</b></> : <span>Нет score</span>}</div>
                <div className={styles.leadMeta}>{business.rating != null && <span><Star size={12}/>{business.rating}</span>}<span>{business.reviewsCount} отзывов</span>{business.website && <a href={business.website} target="_blank" rel="noreferrer"><Search size={12}/>Сайт</a>}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
