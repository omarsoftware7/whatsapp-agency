import api from './client';
import { Brand } from '../types';

export const brandsApi = {
  list: () => api.get<Brand[]>('/brands').then((r) => r.data),
  get: (id: number) => api.get<Brand>(`/brands/${id}`).then((r) => r.data),
  create: (data: any) => api.post<Brand>('/brands', data).then((r) => r.data),
  update: (id: number, data: any) => api.post<Brand>(`/brands/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.post(`/brands/${id}/delete`),
  uploadLogo: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post(`/brands/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  metaStatus: (id: number) => api.get(`/brands/${id}/meta-status`).then((r) => r.data),
  startMetaOAuth: (id: number) => { window.location.href = `/api/brands/${id}/meta-oauth/start`; },
};
