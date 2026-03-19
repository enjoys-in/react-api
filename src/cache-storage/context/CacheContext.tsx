import React, { createContext, useContext, useMemo } from 'react';
import { CacheStorageUtil, type CacheMeta } from '../CacheStorage';


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
        const prefixKey = (key: string) => `${prefix}${key}`;

        return {
            put: <K extends keyof T>(key: K, data: T[K], ttl?: number) =>
                cache.put(prefixKey(String(key)) as K, data, ttl),
            get: <K extends keyof T>(key: K): Promise<T[K] | undefined> =>
                cache.get(prefixKey(String(key)) as K),
            getOrSet: <K extends keyof T>(key: K, fetcher: () => Promise<T[K]>, ttl?: number) =>
                cache.getOrSet(prefixKey(String(key)) as K, fetcher, ttl),
            putHTML: (key: string, html: string, ttl?: number) =>
                cache.putHTML(prefixKey(key), html, ttl),
            getHTML: (key: string) =>
                cache.getHTML(prefixKey(key)),
            putBlob: (key: string, blob: Blob, ttl?: number) =>
                cache.putBlob(prefixKey(key), blob, ttl),
            getBlob: (key: string) =>
                cache.getBlob(prefixKey(key)),
            putArrayBuffer: (key: string, buffer: ArrayBuffer, ttl?: number) =>
                cache.putArrayBuffer(prefixKey(key), buffer, ttl),
            getArrayBuffer: (key: string) =>
                cache.getArrayBuffer(prefixKey(key)),
            putFile: (key: string, file: File, ttl?: number) =>
                cache.putFile(prefixKey(key), file, ttl),
            getFile: (key: string) =>
                cache.getFile(prefixKey(key)),
            delete: (key: keyof T) => cache.delete(prefixKey(String(key))),
            has: (key: keyof T) => cache.has(prefixKey(String(key))),
            keys: () => cache.select((k) => k.startsWith(prefix)),
            clear: async () => {
                const keys = await cache.select((k) => k.startsWith(prefix));
                await Promise.all(keys.map((k) => cache.delete(k)));
            },
            size: () => cache.select((k) => k.startsWith(prefix)).then((res) => res.length),
            select: (filter: (key: string, meta: CacheMeta) => boolean | Promise<boolean>) =>
                cache.select((k, m) => k.startsWith(prefix) && filter(k, m)),
            getMeta: (key: string) => cache.getMeta(prefixKey(key)),
        };
    };

    return { CacheProvider, useCacheStorage };
}
