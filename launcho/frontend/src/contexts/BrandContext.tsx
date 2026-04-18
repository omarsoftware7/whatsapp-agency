import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Brand } from '../types';
import { brandsApi } from '../api/brands';
import { useAuth } from './AuthContext';

interface BrandContextValue {
  brands: Brand[];
  activeBrand: Brand | null;
  setActiveBrand: (brand: Brand) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await brandsApi.list();
      setBrands(list);
      const savedId = localStorage.getItem('active_brand_id');
      const saved = savedId ? list.find((b) => b.id === parseInt(savedId)) : null;
      setActiveBrandState(saved || list[0] || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [user]);

  const setActiveBrand = (brand: Brand) => {
    setActiveBrandState(brand);
    localStorage.setItem('active_brand_id', String(brand.id));
  };

  return (
    <BrandContext.Provider value={{ brands, activeBrand, setActiveBrand, loading, refresh }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}
