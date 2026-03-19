import type { CacheMeta } from '../CacheStorage';

export type { CacheMeta };

export interface CacheOperations<T extends Record<string, any> = Record<string, any>> {
  put: <K extends keyof T>(key: K, data: T[K], ttl?: number) => Promise<void>;
  get: <K extends keyof T>(key: K) => Promise<T[K] | undefined>;
  getOrSet: <K extends keyof T>(key: K, fetcher: () => Promise<T[K]>, ttl?: number) => Promise<T[K]>;
  putHTML: (key: string, html: string, ttl?: number) => Promise<void>;
  getHTML: (key: string) => Promise<string | null>;
  putBlob: (key: string, blob: Blob, ttl?: number) => Promise<void>;
  getBlob: (key: string) => Promise<Blob | null>;
  putArrayBuffer: (key: string, buffer: ArrayBuffer, ttl?: number) => Promise<void>;
  getArrayBuffer: (key: string) => Promise<ArrayBuffer | null>;
  putFile: (key: string, file: File, ttl?: number) => Promise<void>;
  getFile: (key: string) => Promise<File | null>;
  delete: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
  size: () => Promise<number>;
  select: (predicate: (key: string, meta: CacheMeta) => boolean | Promise<boolean>) => Promise<string[]>;
  getMeta: (key: string) => Promise<CacheMeta | undefined>;
}

export interface UseCacheReturn {
  put: (key: string, data: any, ttl?: number) => Promise<void>;
  get: (key: string) => Promise<any>;
  getOrSet: (key: string, fetcher: () => Promise<any>, ttl?: number) => Promise<any>;
  putHTML: (key: string, html: string, ttl?: number) => Promise<void>;
  getHTML: (key: string) => Promise<string | null>;
  putBlob: (key: string, blob: Blob, ttl?: number) => Promise<void>;
  getBlob: (key: string) => Promise<Blob | null>;
  putArrayBuffer: (key: string, buffer: ArrayBuffer, ttl?: number) => Promise<void>;
  getArrayBuffer: (key: string) => Promise<ArrayBuffer | null>;
  putFile: (key: string, file: File, ttl?: number) => Promise<void>;
  getFile: (key: string) => Promise<File | null>;
  delete: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
  size: () => Promise<number>;
  select: (predicate: (key: string, meta: CacheMeta) => boolean | Promise<boolean>) => Promise<string[]>;
  getMeta: (key: string) => Promise<CacheMeta | undefined>;
}