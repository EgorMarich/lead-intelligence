'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { setSession } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OWNER');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data } = await api.post('/auth/session', { organizationId, email, role });
    setSession(data);
    router.push('/leads');
  }

  return (
    <main style={{maxWidth:440,margin:'80px auto',padding:24}}>
      <h1>Lead Intelligence</h1>
      <p>Auth / multi-tenant prototype</p>
      <form onSubmit={submit} style={{display:'grid',gap:12}}>
        <input required placeholder="Organization ID" value={organizationId} onChange={e=>setOrganizationId(e.target.value)} />
        <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option>OWNER</option><option>ADMIN</option><option>MANAGER</option><option>MEMBER</option><option>VIEWER</option>
        </select>
        <button type="submit">Войти</button>
      </form>
    </main>
  );
}
