import React, { createContext, useContext, useMemo } from 'react';
import { CacheStorageUtil } from '../CacheStorage';

const CacheContext = createContext<CacheStorageUtil | null>(null);

export const CacheProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const cacheUtil = useMemo(() => new CacheStorageUtil('my-app-cache'), []);
    return (
        <CacheContext.Provider value={cacheUtil}>
            {children}
        </CacheContext.Provider>
    );
};

export const useCache = () => {
    const ctx = useContext(CacheContext);
    if (!ctx) {
        throw new Error('useCache must be used within a <CacheProvider>');
    }
    return ctx;
};
