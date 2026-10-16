'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ExternalLink, Globe2, Mail, MapPin, MessageCircle, Phone, Plus, Sparkles, Tag, UserRound, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { addLeadNote, enqueueEnrichment, getEnrichment, getLeadWorkspace, updateLeadCrm, getOutreachPreview, createOutreachMessage, sendOutreachMessage, getAiInsight, generateAiInsight, getCommunicationMessages, getReplySuggestion, generateReplySuggestion, useReplySuggestion, dismissReplySuggestion, type OutreachChannel } from '../../../../lib/api';
import styles from '../../app.module.scss';

const STATUSES = ['NEW','CONTACTED','INTERESTED','NEGOTIATION','CONVERTED','LOST'] as const;

export default function LeadWorkspacePage({ params }: { params: { id: string } }) {
  const id = params.id;
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<OutreachChannel>('EMAIL');
  const [outreach, setOutreach] = useState<{recipient:string;subject?:string;body:string}|null>(null);
  const communication = useQuery({ queryKey: ['communication-messages', id], queryFn: () => getCommunicationMessages(id), refetchInterval: 5000 });
  const copilot = useQuery({ queryKey: ['reply-copilot', id], queryFn: () => getReplySuggestion(id) });
  const [replyDraft, setReplyDraft] = useState('');
  const suggestReply = useMutation({ mutationFn: () => generateReplySuggestion(id), onSuccess: (data) => { setReplyDraft(data.suggestion); queryClient.invalidateQueries({ queryKey: ['reply-copilot', id] }); } });
  const useReply = useMutation({ mutationFn: () => useReplySuggestion(copilot.data!.id, replyDraft), onSuccess: () => { setReplyDraft(''); queryClient.invalidateQueries({ queryKey: ['reply-copilot', id] }); queryClient.invalidateQueries({ queryKey: ['communication-messages', id] }); } });
  const dismissReply = useMutation({ mutationFn: () => dismissReplySuggestion(copilot.data!.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reply-copilot', id] }) });
  const ai = useQuery({ queryKey: ['ai-insight', id], queryFn: () => getAiInsight(id) });
  const generateAi = useMutation({ mutationFn: () => generateAiInsight(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-insight', id] }) });
  const { data, isLoading, isError } = useQuery({ queryKey: ['lead-workspace', id], queryFn: () => getLeadWorkspace(id) });
  const update = useMutation({ mutationFn: (payload: Parameters<typeof updateLeadCrm>[1]) => updateLeadCrm(id, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead-workspace', id] }) });
  const enrichment = useQuery({ queryKey: ['enrichment', id], queryFn: () => getEnrichment(id), refetchInterval: 3000 });
  const enrich = useMutation({ mutationFn: () => enqueueEnrichment(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrichment', id] }) });
  const addNote = useMutation({ mutationFn: () => addLeadNote(id, note), onSuccess: () => { setNote(''); queryClient.invalidateQueries({ queryKey: ['lead-workspace', id] }); } });
  const preview = useMutation({ mutationFn: () => getOutreachPreview(id, channel), onSuccess: (data) => setOutreach(data) });
  const createMessage = useMutation({ mutationFn: () => createOutreachMessage(id, { channel, subject: outreach?.subject, body: outreach?.body ?? '' }), onSuccess: (data) => sendMessage.mutate(data.id) });
  const sendMessage = useMutation({ mutationFn: (messageId:string) => sendOutreachMessage(messageId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['outreach', id] }); setOutreach(null); } });

  if (isLoading) return <div className={styles.page}><div className={styles.empty}>Загружаем карточку лида…</div></div>;
  if (isError || !data) return <div className={styles.page}><div className={styles.empty}><strong>Не удалось загрузить лид</strong><span>Проверьте доступ к организации или попробуйте открыть карточку снова.</span></div></div>;

  const { business, score, features, contacts, lead } = data;
  const currentStatus = lead?.status ?? 'NEW';
  const grade = score?.grade ?? lead?.grade ?? 'LOW';
  const reasons = score?.reasons ?? [];
  const missed = (score as any)?.missedOpportunities ?? [];
  const social = contacts.filter((c) => ['TELEGRAM','VK','WHATSAPP','INSTAGRAM'].includes(c.type));

  return (
    <div className={styles.page}>
      <Link href="/leads" className={styles.back}><ArrowLeft size={15}/> Все лиды</Link>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceTitle}>
          <div className={styles.leadHeroIcon}>{business.name.slice(0,1).toUpperCase()}</div>
          <div><div className={styles.eyebrow}>LEAD WORKSPACE</div><h1>{business.name}</h1><p>{[business.city, business.categoryId ? 'Категория' : null].filter(Boolean).join(' · ')}</p></div>
        </div>
        <div className={styles.workspaceScore}><span className={`${styles.grade} ${styles[grade]}`}>{grade}</span><strong>{score?.score ?? lead?.score ?? 0}</strong><small>lead score</small></div>
      </header>

      <div className={styles.workspaceGrid}>
        <main className={styles.workspaceMain}>
          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>AI Sales Intelligence</h2><p>AI объясняет потенциал лида и предлагает следующий шаг.</p></div><Sparkles size={17}/></div>
            {!ai.data ? <div className={styles.aiEmpty}><div><strong>AI-разбор ещё не создан</strong><span>Система проанализирует факты, digital-сигналы, контакты и историю коммуникаций.</span></div><button className={styles.primary} disabled={generateAi.isPending} onClick={()=>generateAi.mutate()}><Sparkles size={13}/> {generateAi.isPending ? 'Анализируем…' : 'Запустить AI-анализ'}</button></div> : <div className={styles.aiPanel}>
              <div className={styles.aiTop}><div><span className={styles.sideLabel}>ICP FIT</span><strong>{ai.data.payload.icpFit}/100</strong></div><span>confidence {Math.round(ai.data.payload.confidence*100)}%</span></div>
              <p className={styles.aiSummary}>{ai.data.payload.summary}</p>
              <div className={styles.aiNext}><span className={styles.sideLabel}>NEXT BEST ACTION</span><strong>{ai.data.payload.nextBestAction.action}</strong><p>{ai.data.payload.nextBestAction.reason}</p></div>
              {ai.data.payload.painPoints.length > 0 && <div className={styles.aiPain}>{ai.data.payload.painPoints.slice(0,4).map((p:any)=><div key={p.title}><b>{p.title}</b><span>{p.evidence}</span></div>)}</div>}
              <div className={styles.aiPitch}><span className={styles.sideLabel}>PITCH</span><p>{ai.data.payload.pitch}</p></div>
              <button className={styles.secondary} disabled={generateAi.isPending} onClick={()=>generateAi.mutate()}><Sparkles size={13}/> Обновить AI-анализ</button>
            </div>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Почему этот лид интересен</h2><p>Система объясняет оценку, а не просто показывает число.</p></div><Sparkles size={17}/></div>
            <div className={styles.reasonGrid}>
              {reasons.length ? reasons.map((r: any) => <div className={styles.reason} key={r.code}><div className={styles.reasonCheck}><Check size={14}/></div><div><strong>{r.label}</strong><span>{r.reason}</span></div><b>+{r.points}</b></div>) : <div className={styles.empty}>Причины score пока не сохранены.</div>}
            </div>
            {missed.length > 0 && <div className={styles.opportunities}><strong>Точки роста</strong>{missed.slice(0,4).map((r:any)=><span key={r.code}>+{r.points} · {r.label}</span>)}</div>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Контакты</h2><p>Контакты, найденные во время enrichment.</p></div><MessageCircle size={17}/></div>
            <div className={styles.contactGrid}>
              {contacts.length ? contacts.map((c) => <div className={styles.contactCard} key={c.id}><span>{iconFor(c.type)}</span><div><small>{c.type}</small><strong>{c.value}</strong></div>{c.isPrimary && <b>PRIMARY</b>}</div>) : <div className={styles.empty}>Контактов пока нет.</div>}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Website Intelligence</h2><p>Что система обнаружила на сайте компании.</p></div><Globe2 size={17}/></div>
            <div className={styles.featureGrid}>{features.slice(0,10).map((f)=><div className={styles.feature} key={f.id}><span>{f.feature}</span><b>{f.value ? 'Обнаружено' : 'Нет'}</b></div>)}</div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Коммуникации</h2><p>Единая история сообщений и входящих ответов.</p></div><MessageCircle size={17}/></div>
            <div className={styles.communicationTimeline}>{(communication.data ?? []).length ? communication.data!.map(m => <div key={m.id} className={`${styles.communicationMessage} ${m.direction === 'INBOUND' ? styles.communicationInbound : styles.communicationOutbound}`}><div><b>{m.direction === 'INBOUND' ? 'Входящее' : 'Исходящее'} · {m.channel}</b><small>{new Date(m.createdAt).toLocaleString('ru-RU')}</small></div><p>{m.body}</p><span>{m.status}</span></div>) : <div className={styles.empty}>История пока пуста.</div>}</div>
            <div className={styles.replyCopilot}>
              <div className={styles.replyCopilotHead}><div><span className={styles.sideLabel}>AI REPLY COPILOT</span><strong>Ответить на последнее сообщение</strong><small>{copilot.data?.analysis ? `${copilot.data.analysis.intent} · ${copilot.data.analysis.sentiment}` : 'AI разберёт намерение и предложит следующий шаг.'}</small></div><Sparkles size={16}/></div>
              {copilot.data?.status === 'SUGGESTED' ? <><textarea value={replyDraft || copilot.data.suggestion} onChange={e=>setReplyDraft(e.target.value)} /><div className={styles.replyActions}><button className={styles.primary} disabled={useReply.isPending} onClick={()=>useReply.mutate()}><Send size={13}/> Отправить ответ</button><button className={styles.secondary} onClick={()=>dismissReply.mutate()}>Отклонить</button></div></> : <button className={styles.secondary} disabled={suggestReply.isPending || !(communication.data ?? []).some(m=>m.direction==='INBOUND')} onClick={()=>suggestReply.mutate()}><Sparkles size={13}/> {suggestReply.isPending ? 'Анализируем…' : 'Предложить ответ'}</button>}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Заметки</h2><p>Контекст для команды продаж.</p></div><Tag size={17}/></div>
            <div className={styles.noteComposer}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Например: владелец отвечает в Telegram после 11:00…"/><button className={styles.primary} disabled={!note.trim() || addNote.isPending} onClick={()=>addNote.mutate()}><Plus size={14}/> Добавить заметку</button></div>
            <div className={styles.notes}>{(lead?.notes ?? []).slice().reverse().map(n=><div className={styles.note} key={n.id}><span>{new Date(n.createdAt).toLocaleString('ru-RU')}</span><p>{n.text}</p></div>)}</div>
          </section>
        </main>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>Outreach</h2><p>Сгенерировать персональное сообщение по найденному контакту.</p></div><Send size={17}/></div>
            <div className={styles.outreachComposer}>
              <div className={styles.outreachChannels}>{(['EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','PHONE'] as OutreachChannel[]).map(c=><button key={c} className={`${styles.channelButton} ${channel===c?styles.channelActive:''}`} onClick={()=>{setChannel(c);setOutreach(null)}}>{c}</button>)}</div>
              <button className={styles.secondary} disabled={preview.isPending} onClick={()=>preview.mutate()}><Sparkles size={13}/> Сгенерировать сообщение</button>
              {preview.error && <small className={styles.outreachError}>Для этого канала нет подходящего контакта.</small>}
              {outreach && <><input value={outreach.subject??''} onChange={e=>setOutreach({...outreach,subject:e.target.value})} placeholder="Тема"/><textarea value={outreach.body} onChange={e=>setOutreach({...outreach,body:e.target.value})}/><small>Получатель: {outreach.recipient}</small><div className={styles.outreachActions}><button className={styles.primary} disabled={createMessage.isPending||sendMessage.isPending} onClick={()=>createMessage.mutate()}><Send size={13}/> Отправить</button><button className={styles.secondary} onClick={()=>setOutreach(null)}>Отмена</button></div></>}
            </div>
          </section>

        <aside className={styles.workspaceAside}>
          <section className={styles.panel}>
            <div className={styles.sideSection}>
              <span className={styles.sideLabel}>ENRICHMENT</span>
              <div className={styles.enrichmentBox}>
                <div><strong>{enrichment.data?.business.enrichmentStatus ?? 'PENDING'}</strong><small>{enrichment.data?.business.enrichedAt ? `Обновлено ${new Date(enrichment.data.business.enrichedAt).toLocaleString('ru-RU')}` : 'Данные ещё не проверялись'}</small></div>
                <button className={styles.secondary} disabled={enrich.isPending || ['QUEUED','RUNNING'].includes(enrichment.data?.job?.status ?? '')} onClick={() => enrich.mutate()}><Sparkles size={13}/> Обновить данные</button>
                {enrichment.data?.business.enrichmentError && <small className={styles.errorText}>{enrichment.data.business.enrichmentError}</small>}
              </div>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.sideSection}><span className={styles.sideLabel}>СТАТУС</span><div className={styles.statusList}>{STATUSES.map(s=><button key={s} className={s===currentStatus?styles.statusActive:styles.statusButton} onClick={()=>update.mutate({status:s})}>{s===currentStatus && <Check size={12}/>} {s}</button>)}</div></div>
            <div className={styles.sideSection}><span className={styles.sideLabel}>КОМПАНИЯ</span><div className={styles.factList}><span><MapPin size={13}/>{business.address ?? business.city}</span>{business.phone && <a href={`tel:${business.phone}`}><Phone size={13}/>{business.phone}</a>}{business.website && <a href={business.website} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Открыть сайт</a>}{business.rating != null && <span>★ {business.rating} · {business.reviewsCount} отзывов</span>}</div></div>
            <div className={styles.sideSection}><span className={styles.sideLabel}>ТЕГИ</span><div className={styles.tagList}>{(lead?.tags ?? []).map(t=><span key={t}>{t}</span>)}{!lead?.tags?.length && <small>Нет тегов</small>}</div></div>
            <div className={styles.sideSection}><span className={styles.sideLabel}>SOCIAL</span><div className={styles.factList}>{social.length ? social.map(c=><span key={c.id}><MessageCircle size={13}/>{c.value}</span>) : <small>Не найдены</small>}</div></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function iconFor(type: string) { if (type.includes('EMAIL')) return <Mail size={15}/>; if (type.includes('PHONE')) return <Phone size={15}/>; if (type.includes('TELEGRAM') || type.includes('VK') || type.includes('WHATSAPP') || type.includes('INSTAGRAM')) return <MessageCircle size={15}/>; return <UserRound size={15}/>; }
