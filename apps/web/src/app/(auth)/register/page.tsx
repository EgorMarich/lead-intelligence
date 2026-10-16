'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { register } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { useOrganizationStore } from '../../../store/organization';
import styles from '../auth.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setActiveOrganization = useOrganizationStore((s) => s.setActiveOrganization);
  const [form, setForm] = useState({ name: '', organizationName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
      localStorage.setItem('lead_access_token', data.tokens.accessToken);
      localStorage.setItem('lead_refresh_token', data.tokens.refreshToken);
      setUser(data.user);
      setActiveOrganization(data.organization.id);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual}>
        <div className={styles.visualContent}>
          <span className={styles.pill}><Sparkles size={13} /> Lead Intelligence</span>
          <h1>Ваш первый поиск<br /><em>начинается здесь.</em></h1>
          <p>Создайте пространство компании и начинайте собирать целевые лиды.</p>
        </div>
      </div>
      <div className={styles.formSide}>
        <form onSubmit={submit} className={styles.form}>
          <div><h2>Создать пространство</h2><p>Это займёт меньше минуты.</p></div>
          <label>Ваше имя<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Название компании<input required value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Пароль<input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          {error && <div className={styles.error}>{error}</div>}
          <button disabled={loading}>{loading ? 'Создаём…' : 'Создать аккаунт'} <ArrowRight size={16} /></button>
          <div className={styles.switch}>Уже есть аккаунт? <Link href="/login">Войти</Link></div>
        </form>
      </div>
    </div>
  );
}
