import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import api from '../api/client';

interface LibraryData { images: any[]; videos: any[]; copies: any[]; uploads: any[] }

export default function BrandLibrary() {
  const { activeBrand } = useBrand();
  const [data, setData] = useState<LibraryData>({ images: [], videos: [], copies: [], uploads: [] });
  const [tab, setTab] = useState<'images' | 'videos' | 'copies' | 'uploads'>('images');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBrand) return;
    api.get('/library', { params: { client_id: activeBrand.id } }).then((r) => setData(r.data));
  }, [activeBrand]);

  const tabs = [
    { key: 'images', label: `Images (${data.images.length})` },
    { key: 'videos', label: `Videos (${data.videos.length})` },
    { key: 'copies', label: `Copies (${data.copies.length})` },
    { key: 'uploads', label: `Uploads (${data.uploads.length})` },
  ] as const;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Brand Library</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t.label}</button>
        ))}
      </div>
      {(tab === 'images' || tab === 'uploads') && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data[tab].map((item, i) => (
            <img key={i} src={item.url} className="w-full aspect-square object-cover rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => setLightbox(item.url)} />
          ))}
          {data[tab].length === 0 && <p className="text-gray-400 text-sm col-span-4 text-center py-8">No {tab} yet</p>}
        </div>
      )}
      {tab === 'videos' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.videos.map((item, i) => <video key={i} src={item.url} controls className="w-full rounded-xl" />)}
          {data.videos.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">No videos yet</p>}
        </div>
      )}
      {tab === 'copies' && (
        <div className="space-y-3">
          {data.copies.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-semibold text-gray-800">{c.headline}</p>
              <p className="text-sm text-gray-600 mt-1">{c.body}</p>
              <p className="text-xs text-indigo-600 mt-1">{c.cta}</p>
            </div>
          ))}
          {data.copies.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No copies yet</p>}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
