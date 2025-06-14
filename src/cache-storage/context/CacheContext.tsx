import React, { createContext, useContext } from 'react';
import { CacheStorageUtil } from '../CacheStorage';


interface CacheContextType<T extends Record<string, any>> {
    cache: CacheStorageUtil<T>;
    namespace: string;
}

export function createCacheProvider<T extends Record<string, any> = Record<string, any>>() {
    const CacheContext = createContext<CacheContextType<T> | undefined>(undefined);

    const CacheProvider = ({
        namespace,
        children,
    }: {
        namespace?: string;
        children: React.ReactNode;
    }) => {
        const cache = new CacheStorageUtil<T>();

        return (
            <CacheContext.Provider value={{ cache, namespace: namespace ? namespace : "api-cache-v1" }}>
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
            clear: () =>
                cache.select((k) => k.startsWith(prefix)).then((keys) => keys.forEach((k) => cache.delete(k))),
            size: () => cache.select((k) => k.startsWith(prefix)).then((res) => res.length),
            select: (filter: (key: string, meta: any) => boolean) =>
                cache.select((k, m) => k.startsWith(prefix) && filter(k, m)),
        };
    };

    return { CacheProvider, useCacheStorage };
}
interface MyCacheSchema {
    user: { name: string };
    token: string;
}

export const { CacheProvider, useCacheStorage } = createCacheProvider<MyCacheSchema>();
