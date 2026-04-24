import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import BrandLibrary from './pages/BrandLibrary';
import LandingPages from './pages/LandingPages';
import Leads from './pages/Leads';
import BusinessCard from './pages/BusinessCard';
import BrandPosts from './pages/BrandPosts';
import ContentPlan from './pages/ContentPlan';
import Pricing from './pages/Pricing';
import KnowledgeBase from './pages/KnowledgeBase';
import Profile from './pages/Profile';
import AdminMetrics from './pages/admin/AdminMetrics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBrands from './pages/admin/AdminBrands';
import AdminJobs from './pages/admin/AdminJobs';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/onboarding',
    element: <ProtectedRoute><Onboarding /></ProtectedRoute>,
  },
  {
    path: '/app',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'library', element: <BrandLibrary /> },
      { path: 'landing-pages', element: <LandingPages /> },
      { path: 'leads', element: <Leads /> },
      { path: 'business-card', element: <BusinessCard /> },
      { path: 'posts', element: <BrandPosts /> },
      { path: 'content-plan', element: <ContentPlan /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'kb', element: <KnowledgeBase /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute><AppShell /></AdminRoute>,
    children: [
      { path: 'metrics', element: <AdminMetrics /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'brands', element: <AdminBrands /> },
      { path: 'jobs', element: <AdminJobs /> },
    ],
  },
  { path: '/', element: <Landing /> },
]);
