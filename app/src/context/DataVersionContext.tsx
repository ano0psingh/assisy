import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const DataVersionContext = createContext<{ dataVersion: number; refresh: () => void } | null>(null);

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [dataVersion, setDataVersion] = useState(0);
  const refresh = useCallback(() => setDataVersion(v => v + 1), []);
  return (
    <DataVersionContext.Provider value={{ dataVersion, refresh }}>
      {children}
    </DataVersionContext.Provider>
  );
}

export function useDataVersion() {
  const ctx = useContext(DataVersionContext);
  if (!ctx) throw new Error('useDataVersion must be used within DataVersionProvider');
  return ctx;
}
