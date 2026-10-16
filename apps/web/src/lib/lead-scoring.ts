import { api } from './api';

export type ScoreRule = { code: string; label: string; points: number; reason: string };
export type ScoringProfile = { id: string; name: string; description?: string; rules: ScoreRule[]; maxScore: number; createdAt: string; updatedAt: string };
export type ScoreResult = {
  profileId: string; profileName: string; score: number;
  grade: 'HOT' | 'WARM' | 'COLD' | 'LOW'; rawScore: number; maxScore: number;
  reasons: Array<ScoreRule & { matched: boolean }>;
  missedOpportunities: Array<ScoreRule & { matched: boolean }>;
};

export async function getScoringProfiles() {
  const { data } = await api.get<ScoringProfile[]>('/lead-scoring/profiles');
  return data;
}
export async function createScoringProfile(payload: { name: string; description?: string; rules: ScoreRule[] }) {
  const { data } = await api.post<ScoringProfile>('/lead-scoring/profiles', payload);
  return data;
}
export async function scoreLead(profileId: string, signals: Record<string, unknown>) {
  const { data } = await api.post<ScoreResult>(`/lead-scoring/profiles/${profileId}/score`, signals);
  return data;
}
