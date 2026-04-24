import api from './client';
import { SessionUser } from '../types';

export const authApi = {
  me: () => api.get<{ user: SessionUser }>('/auth/me').then((r) => r.data.user),
  login: (email: string, password: string) =>
    api.post<{ user: SessionUser }>('/auth/login', { email, password }).then((r) => r.data.user),
  register: (data: { first_name: string; last_name: string; email: string; password: string; referral_code?: string; heard_about?: string }) =>
    api.post<{ user: SessionUser }>('/auth/register', data).then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  googleStart: () => { window.location.href = '/api/auth/google/start'; },
  applyReferral: (referral_code: string) => api.post('/auth/apply-referral', { referral_code }),
};
