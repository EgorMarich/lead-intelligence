'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Flame, Plus, Sparkles } from 'lucide-react';
import { createScoringProfile, getScoringProfiles, scoreLead, ScoreResult, ScoreRule } from '../../../lib/lead-scoring';
import styles from '../app.module.scss';

const DEFAULT_RULES: ScoreRule[] = [
  { code: 'HAS_WEBSITE', label: 'Есть сайт', points: 10, reason: 'У компании есть собственный сайт.' },
  { code: 'NO_ONLINE_BOOKING', label: 'Нет онлайн-записи', points: 25, reason: 'Потенциальная возможность продажи booking-сервиса.' },
  { code: 'HAS_PHONE', label: 'Есть телефон', points: 10, reason: 'Компания доступна по телефону.' },
  { code: 'HAS_EMAIL', label: 'Есть email', points: 10, reason: 'Найден рабочий email.' },
  { code: 'HAS_TELEGRAM', label: 'Есть Telegram', points: 10, reason: 'Найден Telegram-контакт.' },
  { code: 'GOOD_RATING', label: 'Высокий рейтинг', points: 10, reason: 'Рейтинг не ниже 4.5.' },
  { code: 'MANY_REVIEWS', label: 'Много отзывов', points: 15, reason: 'Не менее 100 отзывов.' },
  { code: 'LARGE_TEAM', label: 'Крупная команда', points: 10, reason: 'Потенциально большая команда.' },
];

export default function ScoringPage() {
  const profiles = useQuery({ queryKey: ['scoring-profiles'], queryFn: getScoringProfiles });
  const [name, setName] = useState('Booking SaaS — custom');
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const create = useMutation({
    mutationFn: () => createScoringProfile({ name, rules }),
    onSuccess: (profile) => { profiles.refetch(); setSelected(profile.id); },
  });
  const score = useMutation({
    mutationFn: () => scoreLead(selected, {
      hasWebsite: true, hasOnlineBooking: false, hasEmail: true, hasPhone: true,
      hasTelegram: true, hasVk: false, hasWhatsApp: false, hasInstagram: true,
      rating: 4.8, reviewsCount: 230, employeesCount: 8,
    }),
    onSuccess: setResult,
  });
  const total = useMemo(() => rules.reduce((sum, rule) => sum + Number(rule.points || 0), 0), [rules]);

  function submit(e: FormEvent) { e.preventDefault(); create.mutate(); }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>LEAD SCORING ENGINE</div><h1>Оценка лидов</h1><p>Создавайте scoring-профили под разные продукты и объясняйте, почему лид горячий.</p></div>
      </header>
      <div className={styles.grid}>
        <form className={styles.formPanel} onSubmit={submit}>
          <div className={styles.formSection}>
            <div className={styles.formTitle}><Sparkles size={18}/><div><strong>Scoring profile</strong><span>{rules.length} правил · максимум {total} баллов</span></div></div>
            <label>Название<input value={name} onChange={e => setName(e.target.value)} /></label>
            <div className={styles.leads}>
              {rules.map((rule, index) => (
                <div className={styles.lead} key={rule.code}>
                  <div className={styles.leadMain}><div><strong>{rule.label}</strong><span>{rule.code} · {rule.reason}</span></div></div>
                  <input style={{width: 72}} type="number" min={0} value={rule.points} onChange={e => setRules(prev => prev.map((r, i) => i === index ? {...r, points: Number(e.target.value)} : r))}/>
                </div>
              ))}
            </div>
          </div>
          <button className={styles.primary} disabled={create.isPending}><Plus size={15}/> Сохранить профиль</button>
        </form>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>Профили</h2><p>Несколько scoring-моделей для разных задач продаж.</p></div></div>
          <div className={styles.leads}>
            {(profiles.data ?? []).map(profile => (
              <button key={profile.id} className={styles.lead} style={{textAlign:'left', cursor:'pointer'}} onClick={() => setSelected(profile.id)}>
                <div className={styles.leadMain}><div><strong>{profile.name}</strong><span>{profile.rules.length} правил · {profile.maxScore} баллов</span></div></div>
              </button>
            ))}
            {!profiles.data?.length && <div className={styles.empty}>Создайте первый профиль.</div>}
          </div>
          <div style={{marginTop:18}}>
            <button className={styles.primary} disabled={!selected || score.isPending} onClick={() => score.mutate()}><Flame size={15}/> Протестировать score</button>
          </div>
          {result && <div className={styles.panel} style={{marginTop:18}}>
            <div className={styles.stats}><div className={styles.stat}><Flame size={18}/><span>Lead Score</span><strong>{result.score}</strong><small>{result.grade}</small></div></div>
            <div className={styles.leads}>{result.reasons.map(reason => <div className={styles.lead} key={reason.code}><div className={styles.leadMain}><div><strong>+{reason.points} · {reason.label}</strong><span>{reason.reason}</span></div></div></div>)}</div>
          </div>}
        </section>
      </div>
    </div>
  );
}
