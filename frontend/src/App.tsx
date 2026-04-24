import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { BrandProvider } from './contexts/BrandContext';
import { router } from './router';

export default function App() {
  return (
    <AuthProvider>
      <BrandProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrandProvider>
    </AuthProvider>
  );
}
