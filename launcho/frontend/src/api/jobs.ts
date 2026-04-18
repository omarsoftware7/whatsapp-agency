import api from './client';
import { CreativeJob } from '../types';

export const jobsApi = {
  list: (clientId: number) => api.get<CreativeJob[]>('/jobs', { params: { client_id: clientId } }).then((r) => r.data),
  create: (data: any) => api.post<CreativeJob>('/jobs', data).then((r) => r.data),
  cancel: (id: number) => api.post(`/jobs/${id}/cancel`),
  reset: (id: number) => api.post(`/jobs/${id}/reset`),
  retryVideo: (id: number) => api.post(`/jobs/${id}/retry-video`),
  delete: (id: number) => api.post(`/jobs/${id}/delete`),
  editDesign: (id: number, userEdit: string, imageUrl: string, editMode: string) =>
    api.post(`/jobs/${id}/edit-design`, { user_edit: userEdit, image_url: imageUrl, edit_mode: editMode }),
  editHistory: (id: number) => api.get(`/jobs/${id}/edit-history`).then((r) => r.data),
  publish: (id: number, publishType: string) =>
    api.post('/jobs/publish', { job_id: id, publish_type: publishType }),
  approveDesign: (id: number, index: number) =>
    api.post(`/jobs/${id}/approve-design`, { index }),
  approveCopy: (id: number) => api.post(`/jobs/${id}/approve-copy`),
};
