'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Flame, Globe2, Search, Sparkles, Target, Users } from 'lucide-react';
import { getDiscoveryOverview } from '../../../lib/discovery';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import styles from '../app.module.scss';
export default function DiscoveryPage(){
 const {data,isLoading}=useQuery({queryKey:['discovery-overview'],queryFn:getDiscoveryOverview,refetchInterval:3000});
 if(isLoading||!data)return <div className={styles.empty}>Загрузка discovery…</div>;
 const cards=[['Компании',data.totals.businesses,Users],['Квалифицированные лиды',data.totals.leads,Target],['HOT',data.totals.hot,Flame],['WARM',data.totals.warm,Sparkles]] as const;
 return <div className={styles.page}>
  <header className={styles.header}><div><div className={styles.eyebrow}>LEAD DISCOVERY</div><h1>Поиск клиентов</h1><p>Находите компании, проверяйте сайты и автоматически превращайте их в квалифицированные лиды.</p></div><Link href="/searches/new" className={styles.primary}><Search size={16}/> Новый поиск</Link></header>
  <section className={styles.stats}>{cards.map(([label,value,Icon])=><div className={styles.stat} key={label}><Icon size={17} className={styles.statIcon}/><span>{label}</span><strong>{value.toLocaleString('ru-RU')}</strong><small>в организации</small></div>)}</section>
  <section className={styles.panel} style={{marginBottom:18}}><div className={styles.panelHead}><div><h2>Автоматическая квалификация</h2><p>Search → Crawl → Intelligence → Score → CRM</p></div><Activity size={17}/></div><div style={{padding:18}}><div className={styles.progressTop}><div><span>Проверка сайтов</span><strong>{data.crawl.processedUrls.toLocaleString('ru-RU')} / {data.crawl.totalUrls.toLocaleString('ru-RU')}</strong></div><b>{data.crawl.progress}%</b></div><div className={styles.progress}><i style={{width:`${data.crawl.progress}%`}}/></div><div className={styles.progressMeta}><span><Search size={12}/> активных поисков: {data.active.searches}</span><span><Globe2 size={12}/> активных crawl: {data.active.crawls}</span></div></div></section>
  <section className={styles.panel}><div className={styles.panelHead}><div><h2>Последние поиски</h2><p>Результаты автоматически отправляются на проверку сайтов.</p></div><Link href="/searches">Все поиски <ArrowRight size={13}/></Link></div>{data.recentSearches.length===0?<div className={styles.empty}><Search size={24}/><strong>Начните с первого поиска</strong><span>Например: салоны красоты в Москве или стоматологии в Санкт-Петербурге.</span><Link href="/searches/new" className={styles.primary}>Создать поиск</Link></div>:<div className={styles.table}>{data.recentSearches.map(job=><Link href={`/searches/${job.id}`} className={styles.row} key={job.id}><div><strong>{job.query||'Без запроса'}</strong><span>{job.source} · найдено {job.totalFound}</span></div><span>{job.processed} / {job.limit}</span><StatusBadge status={job.status}/><span className={styles.rowDate}>{new Date(job.createdAt).toLocaleString('ru-RU')}</span></Link>)}</div>}</section>
 </div>;
}
