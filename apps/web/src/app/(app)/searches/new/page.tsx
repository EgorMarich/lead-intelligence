'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createSearch, getDiscoveryOptions, getSources } from '../../../../lib/api';
import styles from '../../app.module.scss';

type Logic = 'AND' | 'OR';
type Condition = { id: number; field: string; operator: string; value: string };

const defaultCondition = (id: number): Condition => ({ id, field: 'hasWebsite', operator: 'isTrue', value: 'true' });

export default function NewSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('mock');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState(100);
  const [logic, setLogic] = useState<Logic>('AND');
  const [conditions, setConditions] = useState<Condition[]>([defaultCondition(1)]);
  const [nextId, setNextId] = useState(2);

  const { data: sources = ['mock'] } = useQuery({ queryKey: ['sources'], queryFn: getSources });
  const { data: options } = useQuery({ queryKey: ['discovery-options'], queryFn: getDiscoveryOptions });

  const fields = options?.fields ?? [];
  const operators = options?.operators ?? {};
  const grades = options?.grades ?? ['HOT', 'WARM', 'COLD', 'LOW'];

  const preview = useMemo(() => {
    const labels = new Map(fields.map(field => [field.value, field.label]));
    return conditions.map(c => {
      const op = operators[c.operator] ?? c.operator;
      const value = ['isTrue', 'isFalse'].includes(c.operator) ? '' : ` ${c.value}`;
      return `${labels.get(c.field) ?? c.field} ${op}${value}`;
    }).join(` ${logic} `);
  }, [conditions, fields, logic, operators]);

  function updateCondition(id: number, patch: Partial<Condition>) {
    setConditions(current => current.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  function fieldMeta(field: string) { return fields.find(item => item.value === field); }

  function addCondition() {
    setConditions(current => [...current, defaultCondition(nextId)]);
    setNextId(id => id + 1);
  }

  function removeCondition(id: number) {
    setConditions(current => current.length === 1 ? current : current.filter(c => c.id !== id));
  }

  function serializeValue(condition: Condition) {
    const meta = fieldMeta(condition.field);
    if (condition.operator === 'isTrue') return true;
    if (condition.operator === 'isFalse') return false;
    if (meta?.valueType === 'number') return Number(condition.value);
    if (condition.operator === 'in') return condition.value.split(',').map(value => value.trim()).filter(Boolean);
    return condition.value;
  }

  const mutation = useMutation({
    mutationFn: () => createSearch({
      source,
      query: query.trim() || undefined,
      cityId: cityId || undefined,
      categoryId: categoryId || undefined,
      limit,
      filters: { version: 1, root: { logic, conditions: conditions.map(c => ({ field: c.field, operator: c.operator, value: serializeValue(c) })) } },
    }),
    onSuccess: job => router.push(`/searches/${job.id}`),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className={styles.page}>
      <Link href="/searches" className={styles.back}><ArrowLeft size={15} /> Назад к поискам</Link>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>ADVANCED DISCOVERY · v0.21</div><h1>Новый поиск</h1><p>Соберите точный ICP из условий и запустите поиск по источнику.</p></div>
      </header>

      <form className={styles.formPanel} onSubmit={submit}>
        <div className={styles.formSection}>
          <div className={styles.formTitle}><Search size={18} /><div><strong>Основные параметры</strong><span>Источник, география и объём выборки</span></div></div>
          <label>Поисковый запрос<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Например: салоны красоты" /></label>
          <div className={styles.two}>
            <label>Источник<select value={source} onChange={e => setSource(e.target.value)}>{sources.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>Количество результатов<input type="number" min={1} max={100000} value={limit} onChange={e => setLimit(Number(e.target.value))} /></label>
          </div>
          <div className={styles.two}>
            <label>Город<select value={cityId} onChange={e => setCityId(e.target.value)}><option value="">Любой город</option>{options?.cities.map(city => <option key={city.id} value={city.id}>{city.name}{city.region ? ` · ${city.region}` : ''}</option>)}</select></label>
            <label>Категория<select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Любая категория</option>{options?.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.formTitle}><SlidersHorizontal size={18} /><div><strong>Query Builder</strong><span>Комбинируйте условия через AND / OR</span></div></div>
          <div className={styles.queryToolbar}>
            <span>Компании должны соответствовать</span>
            <select value={logic} onChange={e => setLogic(e.target.value as Logic)}><option value="AND">ВСЕМ условиям (AND)</option><option value="OR">ЛЮБОМУ условию (OR)</option></select>
          </div>
          <div className={styles.conditionList}>
            {conditions.map((condition, index) => {
              const meta = fieldMeta(condition.field);
              const currentOperators = meta?.operators ?? ['eq'];
              return <div className={styles.conditionRow} key={condition.id}>
                <span className={styles.conditionIndex}>{index + 1}</span>
                <select value={condition.field} onChange={e => {
                  const nextField = e.target.value;
                  const nextMeta = fieldMeta(nextField);
                  updateCondition(condition.id, { field: nextField, operator: nextMeta?.operators[0] ?? 'eq', value: nextMeta?.valueType === 'boolean' ? 'true' : '' });
                }}>
                  {fields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}
                </select>
                <select value={condition.operator} onChange={e => updateCondition(condition.id, { operator: e.target.value })}>
                  {currentOperators.map(operator => <option key={operator} value={operator}>{operators[operator] ?? operator}</option>)}
                </select>
                {condition.operator !== 'isTrue' && condition.operator !== 'isFalse' && (
                  meta?.valueType === 'select' ? <select value={condition.value} onChange={e => updateCondition(condition.id, { value: e.target.value })}>{grades.map(grade => <option key={grade}>{grade}</option>)}</select> :
                  <input type={meta?.valueType === 'number' ? 'number' : 'text'} value={condition.value} onChange={e => updateCondition(condition.id, { value: e.target.value })} placeholder={condition.operator === 'in' ? 'Значения через запятую' : 'Значение'} />
                )}
                <button type="button" className={styles.iconButton} onClick={() => removeCondition(condition.id)} disabled={conditions.length === 1} aria-label="Удалить условие"><Trash2 size={14} /></button>
              </div>;
            })}
          </div>
          <button type="button" className={styles.secondary} onClick={addCondition}><Plus size={14} /> Добавить условие</button>
          <div className={styles.queryPreview}><span>Запрос</span><strong>{preview || 'Без дополнительных фильтров'}</strong></div>
        </div>

        <div className={styles.discoveryHint}>Фильтры сайта, социальных сетей, технологий и lead score используют доступные данные обогащения. Источники, которые не передают такие поля, не будут искусственно считаться совпавшими.</div>
        {mutation.error && <div className={styles.error}>Не удалось создать поиск. Проверьте авторизацию и активную подписку.</div>}
        <button className={styles.primary} disabled={mutation.isPending}><Search size={16} />{mutation.isPending ? 'Создаём задачу…' : 'Запустить поиск'}</button>
      </form>
    </div>
  );
}
