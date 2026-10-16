'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { login } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import styles from '../auth.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem('lead_access_token', data.tokens.accessToken);
      localStorage.setItem('lead_refresh_token', data.tokens.refreshToken);
      setUser(data.user);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual}>
        <div className={styles.visualContent}>
          <span className={styles.pill}><Sparkles size={13} /> Lead Intelligence</span>
          <h1>Находите компании,<br /><em>которым есть что предложить.</em></h1>
          <p>Поиск, сбор и квалификация лидов в одном рабочем пространстве.</p>
        </div>
      </div>
      <div className={styles.formSide}>
        <form onSubmit={submit} className={styles.form}>
          <div>
            <div className={styles.mobileLogo}><Sparkles size={16} /></div>
            <h2>С возвращением</h2>
            <p>Войдите в рабочее пространство Lead Intelligence.</p>
          </div>
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" /></label>
          <label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></label>
          {error && <div className={styles.error}>{error}</div>}
          <button disabled={loading}>{loading ? 'Входим…' : 'Войти'} <ArrowRight size={16} /></button>
          <div className={styles.switch}>Нет аккаунта? <Link href="/register">Создать аккаунт</Link></div>
        </form>
      </div>
    </div>
  );
}
