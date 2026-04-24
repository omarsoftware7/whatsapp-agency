import api from './client';
import { AdminMetrics } from '../types';

export const adminApi = {
  users: {
    list: () => api.get('/admin/users').then((r) => r.data),
    create: (data: any) => api.post('/admin/users', data).then((r) => r.data),
    update: (id: number, data: any) => api.post(`/admin/users/${id}`, data).then((r) => r.data),
  },
  brands: {
    list: () => api.get('/admin/brands').then((r) => r.data),
  },
  jobs: {
    list: (search?: string, page = 1) =>
      api.get('/admin/jobs', { params: { search, page } }).then((r) => r.data),
  },
  landingPages: {
    list: (page = 1) => api.get('/admin/landing-pages', { params: { page } }).then((r) => r.data),
  },
  metrics: (period = 30) =>
    api.get<AdminMetrics>('/admin/metrics', { params: { period } }).then((r) => r.data),
};
