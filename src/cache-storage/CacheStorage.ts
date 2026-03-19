export type CacheMeta = {
  key: string;
  createdAt: number;
  ttl?: number; // in seconds
};

export class CacheStorageUtil<CacheResponseMap extends Record<string, any>> {
  private cacheName: string;
  private metaKey = '/__cache_meta__';
  private metaCache: Record<string, CacheMeta> | null = null;

  constructor(cacheName = 'api-cache') {
    this.cacheName = cacheName;
  }

  private async getCache() {
    return await caches.open(this.cacheName);
  }

  private toCacheKey(key: string): string {
    return `${key}`;
  }

  private async loadMeta(): Promise<Record<string, CacheMeta>> {
    if (this.metaCache) return this.metaCache;
    const cache = await this.getCache();
    const response = await cache.match(this.metaKey);
    this.metaCache = response ? await response.json() : {};
    return this.metaCache!;
  }

  private async saveMeta(meta: Record<string, CacheMeta>) {
    this.metaCache = meta;
    const cache = await this.getCache();
    const response = new Response(JSON.stringify(meta), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(this.metaKey, response);
  }

  private async updateMeta(key: string, ttl?: number) {
    const meta = await this.loadMeta();
    meta[key] = { key, createdAt: Date.now(), ...(ttl ? { ttl } : {}) };
    await this.saveMeta(meta);
  }

  private isExpired(meta: CacheMeta): boolean {
    if (!meta.ttl) return false;
    return Date.now() - meta.createdAt > meta.ttl * 1000;
  }

  async put<K extends keyof CacheResponseMap>(key: K, data: CacheResponseMap[K], ttl?: number) {
    const cache = await this.getCache();
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(this.toCacheKey(String(key)), response);
    await this.updateMeta(String(key), ttl);
  }

  async get<K extends keyof CacheResponseMap>(key: K): Promise<CacheResponseMap[K] | undefined> {
    const meta = (await this.loadMeta())[String(key)];
    if (meta && this.isExpired(meta)) {
      await this.delete(String(key));
      return undefined;
    }

    const cache = await this.getCache();
    const response = await cache.match(this.toCacheKey(String(key)));

    if (response?.headers.get('Content-Type')?.includes('application/json')) {
      return await response.json();
    }

    return undefined;
  }

  async putHTML(key: string, html: string, ttl?: number) {
    const cache = await this.getCache();
    const response = new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
    await cache.put(this.toCacheKey(key), response);
    await this.updateMeta(key, ttl);
  }

  async getHTML(key: string): Promise<string | null> {
    const meta = (await this.loadMeta())[key];
    if (meta && this.isExpired(meta)) {
      await this.delete(key);
      return null;
    }

    const cache = await this.getCache();
    const response = await cache.match(this.toCacheKey(key));
    return response ? await response.text() : null;
  }

  async putBlob(key: string, blob: Blob, ttl?: number) {
    const cache = await this.getCache();
    await cache.put(this.toCacheKey(key), new Response(blob));
    await this.updateMeta(key, ttl);
  }

  async getBlob(key: string): Promise<Blob | null> {
    const meta = (await this.loadMeta())[key];
    if (meta && this.isExpired(meta)) {
      await this.delete(key);
      return null;
    }

    const cache = await this.getCache();
    const response = await cache.match(this.toCacheKey(key));
    return response ? await response.blob() : null;
  }

  async putArrayBuffer(key: string, buffer: ArrayBuffer, ttl?: number) {
    await this.putBlob(key, new Blob([buffer]), ttl);
  }

  async getArrayBuffer(key: string): Promise<ArrayBuffer | null> {
    const blob = await this.getBlob(key);
    return blob ? await blob.arrayBuffer() : null;
  }

  async putFile(key: string, file: File, ttl?: number) {
    await this.putBlob(key, file, ttl);
  }

  async getFile(key: string): Promise<File | null> {
    const blob = await this.getBlob(key);
    return blob ? new File([blob], key, { type: blob.type }) : null;
  }

  async delete(key: string) {
    const cache = await this.getCache();
    await cache.delete(this.toCacheKey(key));
    const meta = await this.loadMeta();
    delete meta[key];
    await this.saveMeta(meta);
  }

  async has(key: string): Promise<boolean> {
    const meta = await this.loadMeta();
    if (meta[key] && this.isExpired(meta[key])) {
      await this.delete(key);
      return false;
    }

    const cache = await this.getCache();
    return !!(await cache.match(this.toCacheKey(key)));
  }

  async keys(): Promise<string[]> {
    const meta = await this.loadMeta();
    const validKeys: string[] = [];
    for (const [key, value] of Object.entries(meta)) {
      if (!this.isExpired(value)) validKeys.push(key);
    }
    return validKeys;
  }

  async select(
    predicate: (key: string, meta: CacheMeta) => boolean | Promise<boolean>
  ): Promise<string[]> {
    const meta = await this.loadMeta();
    const results: string[] = [];

    for (const [key, value] of Object.entries(meta)) {
      if (this.isExpired(value)) continue;
      if (await predicate(key, value)) results.push(key);
    }

    return results;
  }

  async clear() {
    this.metaCache = null;
    await caches.delete(this.cacheName);
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }

  async getOrSet<K extends keyof CacheResponseMap>(
    key: K,
    fetcher: () => Promise<CacheResponseMap[K]>,
    ttl?: number
  ): Promise<CacheResponseMap[K]> {
    const cached = await this.get(key);
    if (cached !== undefined) return cached;
    const data = await fetcher();
    await this.put(key, data, ttl);
    return data;
  }

  async getMeta(key: string): Promise<CacheMeta | undefined> {
    const meta = (await this.loadMeta())[key];
    if (!meta) return undefined;
    if (this.isExpired(meta)) {
      await this.delete(key);
      return undefined;
    }
    return meta;
  }
}
