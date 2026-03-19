import { useMemo } from 'react';
import { CacheStorageUtil, type CacheMeta } from '../CacheStorage';
import type { UseCacheReturn } from '../types/cache.interface';

export function useCache(namespace?: string): UseCacheReturn {
  return useMemo(() => {
    const prefix = namespace ? `${namespace}/` : '';
    const base = new CacheStorageUtil();
    const prefixKey = (key: string) => prefix + key;

    return {
      put: (key: string, data: any, ttl?: number) => base.put(prefixKey(key), data, ttl),
      get: (key: string) => base.get(prefixKey(key)),
      getOrSet: async (key: string, fetcher: () => Promise<any>, ttl?: number) => {
        const cached = await base.get(prefixKey(key));
        if (cached !== undefined) return cached;
        const data = await fetcher();
        await base.put(prefixKey(key), data, ttl);
        return data;
      },
      putHTML: (key: string, html: string, ttl?: number) => base.putHTML(prefixKey(key), html, ttl),
      getHTML: (key: string) => base.getHTML(prefixKey(key)),
      putBlob: (key: string, blob: Blob, ttl?: number) => base.putBlob(prefixKey(key), blob, ttl),
      getBlob: (key: string) => base.getBlob(prefixKey(key)),
      putArrayBuffer: (key: string, buffer: ArrayBuffer, ttl?: number) => base.putArrayBuffer(prefixKey(key), buffer, ttl),
      getArrayBuffer: (key: string) => base.getArrayBuffer(prefixKey(key)),
      putFile: (key: string, file: File, ttl?: number) => base.putFile(prefixKey(key), file, ttl),
      getFile: (key: string) => base.getFile(prefixKey(key)),
      delete: (key: string) => base.delete(prefixKey(key)),
      has: (key: string) => base.has(prefixKey(key)),
      keys: () => base.select((k) => k.startsWith(prefix)),
      clear: async () => {
        const keys = await base.select((k) => k.startsWith(prefix));
        await Promise.all(keys.map(k => base.delete(k)));
      },
      size: () => base.select((k) => k.startsWith(prefix)).then(res => res.length),
      select: (filter: (key: string, meta: CacheMeta) => boolean | Promise<boolean>) =>
        base.select((k, m) => k.startsWith(prefix) && filter(k, m)),
      getMeta: (key: string) => base.getMeta(prefixKey(key)),
    };
  }, [namespace]);
}
