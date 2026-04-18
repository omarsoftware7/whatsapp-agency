import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { jobsApi } from '../api/jobs';
import { CreativeJob, JobType, ImageSize, Language } from '../types';
import toast from 'react-hot-toast';

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'product_sale', label: 'Product Sale' },
  { value: 'from_image', label: 'From Image' },
  { value: 'before_after', label: 'Before & After' },
  { value: 'multi_mode', label: 'Multi Products' },
  { value: 'tips_carousel', label: 'Tips Carousel' },
  { value: 'content_strategy', label: 'Content Strategy' },
  { value: 'ugc_video', label: 'UGC Video' },
  { value: 'video', label: 'Video' },
  { value: 'reel', label: 'Reel' },
];

const STAGE_LABELS: Record<string, string> = {
  await_user_input: 'Waiting for input',
  pending: 'Pending',
  generate_design: 'Generating design…',
  generate_video: 'Generating video…',
  await_design_approval: 'Review design',
  generate_ad_copy: 'Writing copy…',
  await_copy_approval: 'Review copy',
  await_publish_approval: 'Ready to publish',
  publishing: 'Publishing…',
  generate_multi_variants: 'Generating variants…',
  completed: 'Published ✓',
  rejected: 'Cancelled',
};

const STAGE_COLORS: Record<string, string> = {
  await_design_approval: 'bg-yellow-100 text-yellow-800',
  await_copy_approval: 'bg-blue-100 text-blue-800',
  await_publish_approval: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  generate_design: 'bg-purple-100 text-purple-800',
  generate_video: 'bg-purple-100 text-purple-800',
};

export default function Dashboard() {
  const { activeBrand } = useBrand();
  const [jobs, setJobs] = useState<CreativeJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CreativeJob | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Create form state
  const [jobType, setJobType] = useState<JobType>('announcement');
  const [imageSize, setImageSize] = useState<ImageSize>('post');
  const [language, setLanguage] = useState<Language>('en');
  const [userMessage, setUserMessage] = useState('');

  const loadJobs = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const data = await jobsApi.list(activeBrand.id);
      setJobs(data);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, [activeBrand]);

  // Poll for in-progress jobs
  useEffect(() => {
    const inProgress = jobs.some((j) => ['generate_design','generate_video','generate_ad_copy','publishing','generate_multi_variants'].includes(j.current_stage));
    if (!inProgress) return;
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs]);

  const handleCreate = async () => {
    if (!activeBrand || !userMessage.trim()) return;
    setCreating(true);
    try {
      const job = await jobsApi.create({
        client_id: activeBrand.id,
        job_type: jobType,
        image_size: imageSize,
        language,
        user_message: userMessage,
      });
      setJobs((prev) => [job, ...prev]);
      setUserMessage('');
      setSelectedJob(job);
      toast.success('Job created! Generating…');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const handleApproveDesign = async (job: CreativeJob, index: number) => {
    try {
      await jobsApi.approveDesign(job.id, index);
      toast.success('Design approved! Generating copy…');
      loadJobs();
    } catch { toast.error('Failed to approve design'); }
  };

  const handleApproveCopy = async (job: CreativeJob) => {
    try {
      await jobsApi.approveCopy(job.id);
      toast.success('Copy approved!');
      loadJobs();
    } catch { toast.error('Failed to approve copy'); }
  };

  const handlePublish = async (job: CreativeJob) => {
    try {
      await jobsApi.publish(job.id, 'post');
      toast.success('Publishing to Facebook & Instagram…');
      loadJobs();
    } catch { toast.error('Failed to publish'); }
  };

  const handleCancel = async (job: CreativeJob) => {
    try {
      await jobsApi.cancel(job.id);
      loadJobs();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleDelete = async (job: CreativeJob) => {
    try {
      await jobsApi.delete(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      if (selectedJob?.id === job.id) setSelectedJob(null);
    } catch { toast.error('Failed to delete'); }
  };

  const filteredJobs = jobs.filter((j) =>
    !search || j.user_message?.toLowerCase().includes(search.toLowerCase()) || j.job_type.includes(search)
  );

  const adCopy = selectedJob?.ad_copy ? JSON.parse(selectedJob.ad_copy) : null;

  return (
    <div className="h-full flex">
      {/* Left column: create + job list */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Create form */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Create Content</h2>
          <div className="space-y-3">
            <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={imageSize} onChange={(e) => setImageSize(e.target.value as ImageSize)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="post">Post (1:1)</option>
                <option value="story">Story (9:16)</option>
              </select>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="en">EN</option>
                <option value="ar">AR</option>
                <option value="he">HE</option>
              </select>
            </div>
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Describe what you want to create…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !userMessage.trim() || !activeBrand}
              className="w-full bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : '✨ Generate'}
            </button>
          </div>
        </div>

        {/* Search + job list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No jobs yet</div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedJob?.id === job.id ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase">{job.job_type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-800 truncate mt-0.5">{job.user_message || '(no message)'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STAGE_COLORS[job.current_stage] || 'bg-gray-100 text-gray-600'}`}>
                    {STAGE_LABELS[job.current_stage] || job.current_stage}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right column: job details */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedJob ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">🎨</div>
              <p>Select a job to view details</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.job_type.replace(/_/g, ' ')}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedJob.user_message}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCancel(selectedJob)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleDelete(selectedJob)} className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>

            {/* Design variations */}
            {selectedJob.design_variations?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Designs</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedJob.design_variations.map((url, i) => (
                    <div key={i} className="relative group">
                      {selectedJob.media_type === 'video' ? (
                        <video src={url} controls className="w-full rounded-xl" />
                      ) : (
                        <img
                          src={url}
                          className="w-full rounded-xl cursor-zoom-in"
                          onClick={() => setSelectedImage(url)}
                        />
                      )}
                      {selectedJob.current_stage === 'await_design_approval' && (
                        <button
                          onClick={() => handleApproveDesign(selectedJob, i)}
                          className="absolute bottom-2 left-2 right-2 bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✓ Approve this design
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ad copy */}
            {adCopy && (
              <div className="mb-6 bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Ad Copy</h3>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Headline</p>
                  <p className="text-sm text-gray-800 font-medium">{adCopy.headline}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Body</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{adCopy.body}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">CTA</p>
                  <p className="text-sm text-gray-800">{adCopy.cta}</p>
                </div>
                {selectedJob.current_stage === 'await_copy_approval' && (
                  <button onClick={() => handleApproveCopy(selectedJob)} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                    ✓ Approve Copy
                  </button>
                )}
              </div>
            )}

            {/* Publish */}
            {selectedJob.current_stage === 'await_publish_approval' && (
              <button onClick={() => handlePublish(selectedJob)} className="w-full bg-green-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors">
                🚀 Publish to Facebook & Instagram
              </button>
            )}

            {/* Published result */}
            {selectedJob.current_stage === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                ✅ Published successfully!
                {selectedJob.instagram_permalink && (
                  <a href={selectedJob.instagram_permalink} target="_blank" rel="noopener noreferrer" className="block mt-1 text-green-600 underline">View on Instagram</a>
                )}
              </div>
            )}

            {/* Error */}
            {selectedJob.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                ⚠️ {selectedJob.error_message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-h-full max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
