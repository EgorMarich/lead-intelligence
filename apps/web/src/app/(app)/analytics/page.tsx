'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Building2, CheckCircle2, Mail, Search, Target, TrendingUp, Zap } from 'lucide-react';
import { getAnalyticsOverview } from '../../../lib/api';
import styles from '../app.module.scss';

const labels: Record<string, string> = {
  qualifiedFromBusinesses: 'Qualified / companies',
  contactedFromQualified: 'Contacted / qualified',
  interestedFromContacted: 'Interested / contacted',
  negotiationFromInterested: 'Negotiation / interested',
  convertedFromNegotiation: 'Converted / negotiation',
  overallConversion: 'Overall conversion',
};

function Metric({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return <div className={styles.stat}><div className={styles.statIcon}><Icon size={18}/></div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-overview', days],
    queryFn: () => getAnalyticsOverview({
      from: new Date(Date.now() - days * 86400000).toISOString(),
      to: new Date().toISOString(),
    }),
  });

  const rates = useMemo(() => Object.entries(data?.funnel.rates ?? {}), [data]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>ANALYTICS & FUNNEL</div><h1>Аналитика</h1><p>От найденной компании до конверсии в клиента.</p></div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={styles.analyticsSelect}>
          <option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option>
        </select>
      </header>

      {isLoading && <section className={styles.panel}><div className={styles.empty}><BarChart3 size={26}/><strong>Собираем аналитику…</strong></div></section>}
      {error && <div className={styles.error}>Не удалось загрузить аналитику.</div>}

      {data && <>
        <section className={styles.stats}>
          <Metric icon={Search} label="Найдено" value={data.discovery.found} hint={`${data.discovery.jobs} поисковых задач`} />
          <Metric icon={Building2} label="Компаний" value={data.funnel.businesses} hint="создано за период" />
          <Metric icon={Zap} label="Обогащено" value={data.enrichment.completed} hint={`${data.enrichment.successRate}% success rate`} />
          <Metric icon={Target} label="Qualified" value={data.funnel.qualified} hint={`${data.funnel.rates.qualifiedFromBusinesses ?? 0}% от компаний`} />
          <Metric icon={Mail} label="Отправлено" value={data.outreach.sent} hint={`${data.outreach.sendRate}% send rate`} />
          <Metric icon={CheckCircle2} label="Converted" value={data.funnel.converted} hint={`${data.funnel.rates.overallConversion ?? 0}% overall`} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>Sales Funnel</h2><p>Текущее состояние лидов, созданных за выбранный период.</p></div><TrendingUp size={18}/></div>
          <div className={styles.funnel}>
            {[
              ['companies','Компании',data.funnel.businesses],
              ['qualified','Qualified',data.funnel.qualified],
              ['contacted','Contacted',data.funnel.contacted],
              ['interested','Interested',data.funnel.interested],
              ['negotiation','Negotiation',data.funnel.negotiation],
              ['converted','Converted',data.funnel.converted],
            ].map(([key,label,value]) => <div className={styles.funnelRow} key={String(key)}><span>{label}</span><strong>{Number(value)}</strong><i style={{width: `${data.funnel.businesses ? Math.max(3, Math.min(100, Number(value) / data.funnel.businesses * 100)) : 3}%`}} /></div>)}
          </div>
        </section>

        <section className={styles.twoPanels}>
          <div className={styles.panel}><div className={styles.panelHead}><div><h2>Конверсия</h2><p>Переход между этапами.</p></div></div><div className={styles.settingsList}>
            {rates.map(([key, value]) => <div className={styles.settingRow} key={key}><div><strong>{labels[key] ?? key}</strong></div><b>{value}%</b></div>)}
          </div></div>
          <div className={styles.panel}><div className={styles.panelHead}><div><h2>Каналы Outreach</h2><p>Отправленные сообщения.</p></div></div><div className={styles.settingsList}>
            {data.outreach.byChannel.length ? data.outreach.byChannel.map((item) => <div className={styles.settingRow} key={item.channel}><div><strong>{item.channel}</strong><span>{item.total} создано</span></div><b>{item.sent} sent</b></div>) : <div className={styles.empty}>Пока нет сообщений.</div>}
          </div></div>
        </section>
      </>}
    </div>
  );
}
