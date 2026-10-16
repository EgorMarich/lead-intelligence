'use client';
import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Globe, Loader2, ShieldCheck } from 'lucide-react';
import { analyzeWebsite, WebsiteAnalysis } from '../../../lib/api';
import styles from '../app.module.scss';
export default function WebsitePage() {
  const [url,setUrl]=useState(''); const [result,setResult]=useState<WebsiteAnalysis|null>(null);
  const mutation=useMutation({mutationFn:()=>analyzeWebsite(url,3),onSuccess:setResult});
  const submit=(e:FormEvent)=>{e.preventDefault();setResult(null);mutation.mutate()};
  return <div className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>WEBSITE INTELLIGENCE</div><h1>Анализ сайта</h1><p>Контакты, технологии и коммерческие сигналы компании.</p></div></header>
    <form className={styles.formPanel} onSubmit={submit}><div className={styles.formSection}>
      <div className={styles.formTitle}><Globe size={18}/><div><strong>Website crawler</strong><span>До 3 страниц в v0.9</span></div></div>
      <label>URL сайта<input required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.ru"/></label>
      {mutation.isError&&<div className={styles.error}>Не удалось проанализировать сайт.</div>}
    </div><button className={styles.primary} disabled={mutation.isPending}>{mutation.isPending?<><Loader2 size={15}/> Анализируем…</>:<><Globe size={15}/> Запустить анализ</>}</button></form>
    {result&&<section className={styles.panel} style={{marginTop:18}}><div className={styles.panelHead}><div><h2>{result.title||result.finalUrl}</h2><p>{result.finalUrl} · {result.pages} стр.</p></div></div>
      <div className={styles.stats}><div className={styles.stat}><ShieldCheck size={18}/><span>SSL</span><strong>{result.ssl?'Да':'Нет'}</strong><small>HTTPS</small></div><div className={styles.stat}><Globe size={18}/><span>Онлайн-запись</span><strong>{result.signals.onlineBooking?'Есть':'Не найдена'}</strong><small>по сигналам</small></div><div className={styles.stat}><Globe size={18}/><span>Контакты</span><strong>{result.contacts.emails.length+result.contacts.phones.length}</strong><small>найдено</small></div></div>
      <div className={styles.leads}>{[['Технологии',result.technologies.join(' · ')||'Не определены'],['Email',result.contacts.emails.join(' · ')||'Не найден'],['Телефон',result.contacts.phones.join(' · ')||'Не найден'],['Соцсети',Object.values(result.contacts.social).flat().join(' · ')||'Не найдены']].map(([a,b])=><div className={styles.lead} key={a}><div className={styles.leadMain}><div><strong>{a}</strong><span>{b}</span></div></div></div>)}</div>
    </section>}
  </div>;
}
