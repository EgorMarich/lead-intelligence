const KEY = 'lead-intelligence.session';
export type Session = {
  sessionId: string;
  user: { id: string; organizationId: string; email: string; role: 'OWNER'|'ADMIN'|'MANAGER'|'MEMBER'|'VIEWER' };
};
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setSession(value: Session) { localStorage.setItem(KEY, JSON.stringify(value)); }
export function clearSession() { localStorage.removeItem(KEY); }
