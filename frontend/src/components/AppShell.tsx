import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { t, getLang } from '../i18n';

const navItems = [
  { key: 'dashboard',    path: '/app',              icon: '🎨' },
  { key: 'library',      path: '/app/library',       icon: '📚' },
  { key: 'landing_pages',path: '/app/landing-pages', icon: '🌐' },
  { key: 'leads',        path: '/app/leads',         icon: '👥' },
  { key: 'business_card',path: '/app/business-card', icon: '💳' },
  { key: 'posts',        path: '/app/posts',         icon: '📅' },
  { key: 'content_plan', path: '/app/content-plan',  icon: '📋' },
  { key: 'pricing',      path: '/app/pricing',       icon: '💎' },
  { key: 'knowledge_base',path: '/app/kb',           icon: '📖' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { brands, activeBrand, setActiveBrand } = useBrand();
  const navigate = useNavigate();
  const lang = getLang();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand switcher */}
        <div className="p-4 border-b border-gray-100">
          {activeBrand?.logo_url && (
            <img src={activeBrand.logo_url} alt="logo" className="h-10 w-10 rounded-full object-cover mb-2" />
          )}
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            value={activeBrand?.id || ''}
            onChange={(e) => {
              const brand = brands.find((b) => b.id === parseInt(e.target.value));
              if (brand) setActiveBrand(brand);
            }}
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.business_name}</option>
            ))}
          </select>
        </div>

        {/* Credits */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between"><span>{t('image_credits', lang)}</span><span className="font-semibold text-gray-700">{user.image_credits_remaining}</span></div>
            <div className="flex justify-between"><span>{t('video_credits', lang)}</span><span className="font-semibold text-gray-700">{user.video_credits_remaining}</span></div>
            <div className="flex justify-between"><span>{t('text_credits', lang)}</span><span className="font-semibold text-gray-700">{user.text_credits_remaining}</span></div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{t(item.key, lang)}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</div>
              <NavLink to="/admin/users" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">👤 Users</NavLink>
              <NavLink to="/admin/metrics" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">📊 Metrics</NavLink>
              <NavLink to="/admin/brands" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">🏢 All Brands</NavLink>
              <NavLink to="/admin/jobs" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">⚙️ All Jobs</NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <NavLink to="/app/profile" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2">
            {user?.avatar_url
              ? <img src={user.avatar_url} className="h-7 w-7 rounded-full" />
              : <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">{user?.first_name?.[0]}</div>
            }
            <span>{user?.first_name} {user?.last_name}</span>
          </NavLink>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            {t('logout', lang)}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
