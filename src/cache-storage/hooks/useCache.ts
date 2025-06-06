import { useMemo } from 'react';
import { CacheStorageUtil } from '../utils/CacheStorage';

export function useCacheStorage(namespace?: string) {
  return useMemo(() => {
    const prefix = namespace ? `${namespace}/` : '';
    const base = new CacheStorageUtil();
    return {
      put: (key: string, data: any, ttl?: number) => base.put(prefix + key, data, ttl),
      get: (key: string) => base.get(prefix + key),
      putFile: (key: string, file: File, ttl?: number) => base.putFile(prefix + key, file, ttl),
      getFile: (key: string) => base.getFile(prefix + key),
      delete: (key: string) => base.delete(prefix + key),
      has: (key: string) => base.has(prefix + key),
      keys: () => base.select((k) => k.startsWith(prefix)),
      clear: () => base.select((k) => k.startsWith(prefix)).then(keys => keys.forEach(k => base.delete(k))),
      size: () => base.select((k) => k.startsWith(prefix)).then(res => res.length),
      select: (filter: (key: string, meta: any) => boolean) =>
        base.select((k, m) => k.startsWith(prefix) && filter(k, m)),
    };
  }, [namespace]);
}
