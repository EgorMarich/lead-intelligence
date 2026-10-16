"use client";
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {getSequences,getSequenceEnrollments,createSequence,activateSequence} from '@/lib/api';
import styles from '../app.module.scss';

export default function SequencesPage(){
 const q=useQuery({queryKey:['sequences'],queryFn:getSequences});
 const e=useQuery({queryKey:['sequence-enrollments'],queryFn:getSequenceEnrollments});
 const [name,setName]=useState('AI Adaptive Lead Follow-up'); const [busy,setBusy]=useState(false);
 async function create(){setBusy(true);try{await createSequence({name,automationMode:'AI_ADAPTIVE',aiEnabled:true,aiAllowedChannels:['EMAIL','TELEGRAM','VK','WHATSAPP'],aiMinConfidence:.62,aiDefaultDelayMinutes:1440,aiMaxDelayMinutes:10080,steps:[{delayMinutes:0,channel:'EMAIL',subject:'Идея для {{business.name}}',body:'Здравствуйте!\n\nНашёл {{business.name}} и подготовил несколько идей по привлечению клиентов. Если интересно, отправлю короткий разбор.'},{delayMinutes:1440,channel:'EMAIL',subject:'Re: идея для {{business.name}}',body:'Возвращаюсь к своему сообщению. Могу показать конкретные точки роста для {{business.name}} без обязательств.'},{delayMinutes:2880,channel:'TELEGRAM',body:'Подскажите, актуально ли обсудить идеи по привлечению клиентов для {{business.name}}?'}],stopOnReply:true});await q.refetch()}finally{setBusy(false)}}
 return <div className={styles.page}><div className={styles.pageHeader}><div><h1>AI Sales Automation</h1><p>AI выбирает канал, персонализирует каждое касание, анализирует реакцию и управляет следующим шагом.</p></div></div>
 <div className={styles.card}><h2>Создать AI sequence</h2><div className={styles.formRow}><input value={name} onChange={x=>setName(x.target.value)} className={styles.input}/><button onClick={create} disabled={busy} className={styles.button}>{busy?'Создаю…':'Создать'}</button></div><p className={styles.muted}>AI adaptive: решение принимается перед каждым шагом. При явном отказе sequence останавливается.</p></div>
 <div className={styles.card}><h2>Sequences</h2>{q.data?.map(x=><div key={x.id} className={styles.listRow}><div><b>{x.name}</b><div>{x.steps.length} шагов · {x.status} · {x.automationMode==='AI_ADAPTIVE'?'AI adaptive':'Static'}</div></div><button className={styles.button} onClick={()=>activateSequence(x.id).then(()=>q.refetch())}>{x.status==='ACTIVE'?'Активна':'Активировать'}</button></div>)}</div>
 <div className={styles.card}><h2>Automation</h2><div className={styles.statsGrid}><div><b>Channel selection</b><span>AI выбирает лучший доступный канал.</span></div><div><b>Personalization</b><span>Сообщение генерируется из реального контекста лида.</span></div><div><b>Next best action</b><span>AI решает follow-up, qualification, call или stop.</span></div><div><b>Safety</b><span>Opt-out, do-not-contact и CRM stop statuses имеют приоритет.</span></div></div></div>
 <div className={styles.card}><h2>Enrollments</h2>{e.data?.slice(0,30).map(x=><div key={x.id} className={styles.listRow}><span>{x.status}</span><span>step {x.currentStep}</span><span>{x.nextRunAt?new Date(x.nextRunAt).toLocaleString():'—'}</span><span>{x.stopReason??''}</span></div>)}</div></div>
}
