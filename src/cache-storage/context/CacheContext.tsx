import React, { createContext, useContext, useMemo } from 'react';
import { CacheStorageUtil } from '../CacheStorage';


interface CacheContextType<T extends Record<string, any>> {
    cache: CacheStorageUtil<T>;
    namespace: string;
}

export function createCacheProvider<T extends Record<string, any> = Record<string, any>>() {
    const CacheContext = createContext<CacheContextType<T> | undefined>(undefined);

    const CacheProvider = ({
        namespace = 'api-cache-v1',
        children,
    }: {
        namespace?: string;
        children: React.ReactNode;
    }) => {
        const cache = useMemo(() => new CacheStorageUtil<T>(namespace), [namespace]);

        return (
            <CacheContext.Provider value={{ cache, namespace }}>
                {children}
            </CacheContext.Provider>
        );
    };

    const useCacheStorage = () => {
        const context = useContext(CacheContext);
        if (!context) throw new Error('useCacheStorage must be used within CacheProvider');
        const { cache, namespace: prefix } = context;


        return {
            put: <K extends keyof T>(key: K, data: T[K], ttl?: number) =>
                cache.put(`${prefix}${String(key)}` as K, data, ttl),
            get: <K extends keyof T>(key: K): Promise<T[K] | undefined> =>
                cache.get(`${prefix}${String(key)}` as K),
            delete: (key: keyof T) => cache.delete(`${prefix}${String(key)}`),
            has: (key: keyof T) => cache.has(`${prefix}${String(key)}`),
            keys: () => cache.select((k) => k.startsWith(prefix)),
            clear: async () => {
                const keys = await cache.select((k) => k.startsWith(prefix));
                await Promise.all(keys.map((k) => cache.delete(k)));
            },
            size: () => cache.select((k) => k.startsWith(prefix)).then((res) => res.length),
            select: (filter: (key: string, meta: any) => boolean) =>
                cache.select((k, m) => k.startsWith(prefix) && filter(k, m)),
        };
    };

    return { CacheProvider, useCacheStorage };
}
