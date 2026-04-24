export default function KnowledgeBase() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base</h1>
      <div className="space-y-4">
        {[
          { q: 'How does credit billing work?', a: 'Each AI generation costs credits: 1 image credit per design, 1 text credit per ad copy, 1 video credit per video, 1 landing credit per landing page. Credits reset monthly on your billing date.' },
          { q: 'How do I connect Facebook & Instagram?', a: 'Go to your brand settings and click "Connect Meta". You\'ll be redirected to Facebook to authorize Launcho to publish on your behalf.' },
          { q: 'What is multi-mode?', a: 'Multi-mode lets you create a template design and then automatically generate variants for multiple products using the same layout.' },
          { q: 'How does UGC video work?', a: 'UGC Video generates authentic-looking user-generated content style videos using our AI video model (veo3_fast). Upload a product image and we create a compelling video around it.' },
          { q: 'What languages are supported?', a: 'Launcho supports English, Arabic, and Hebrew — including full RTL (right-to-left) layout support for Arabic and Hebrew.' },
          { q: 'Can I schedule posts?', a: 'Yes! After approving a design and copy, you can schedule the post for any future date and time instead of publishing immediately.' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-2">{item.q}</h3>
            <p className="text-sm text-gray-600">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
