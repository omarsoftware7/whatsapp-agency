import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-indigo-600">Launcho</span>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link to="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-col items-center text-center px-6 pt-20 pb-32 max-w-4xl mx-auto">
        <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          WhatsApp Marketing Automation
        </span>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Your AI-powered<br />brand design studio
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl">
          Launcho connects your WhatsApp business to an intelligent design workflow — generate ads, manage brand assets, and approve content, all from your phone.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link to="/register" className="bg-indigo-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm">
            Start for free
          </Link>
          <Link to="/login" className="border border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 text-left w-full">
          {[
            { icon: '💬', title: 'WhatsApp-native', desc: 'Clients send product photos via WhatsApp and get AI-generated ad designs back in minutes.' },
            { icon: '🎨', title: 'Brand consistency', desc: 'Store your logo, colors, and tone. Every design follows your brand guidelines automatically.' },
            { icon: '✅', title: 'One-tap approval', desc: 'Review and approve design variations directly in the dashboard. No back-and-forth emails.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
