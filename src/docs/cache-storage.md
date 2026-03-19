A powerful, flexible React utility and hook for working with the Cache Storage API — with full support for:

✅ Files, Blobs, JSON, HTML, ArrayBuffer, and Text

✅ Custom cache names and namespaces

✅ Entry TTL (expiry support)

✅ Metadata tracking & inspection

✅ Query selectors (`.select()`)

✅ `getOrSet` pattern (fetch-on-miss)

✅ In-memory meta caching for fast reads

✅ Built-in React Context + Hook

## Features

🧠 React Hook API – use cache storage anywhere in your components

🗃️ File-safe – supports binary types like Blob, ArrayBuffer, and File

📦 Namespaced caches – create isolated buckets by name

⏳ TTL Expiry – automatic expiration support with timestamps

🎯 Flexible queries – filter or select items using `.select()`

💾 Smart metadata – access `createdAt`, `ttl` via `getMeta()`

🔄 Fetch-on-miss – `getOrSet()` caches the result of a fetcher function

---

## Usage

### Option 1: `useCache` Hook (standalone, no provider needed)

```tsx
import { useCache } from '@enjoys/react-api/cache-storage';

function YourComponent() {
  const cache = useCache('my-namespace');

  useEffect(() => {
    cache.put('my-key', { name: 'John' }, 3600); // TTL in seconds
  }, []);

  return <div>Check your cache!</div>;
}
```

### Option 2: Context Provider (typed, app-wide)

```tsx
import { createCacheProvider } from '@enjoys/react-api/cache-storage';

interface MyCacheSchema {
  user: { name: string };
  token: string;
}

const { CacheProvider, useCacheStorage } = createCacheProvider<MyCacheSchema>();

function App() {
  return (
    <CacheProvider namespace="my-app">
      <YourComponent />
    </CacheProvider>
  );
}

function YourComponent() {
  const cache = useCacheStorage();

  useEffect(() => {
    cache.put('user', { name: 'Alice' }, 3600);
  }, []);

  return <div>Check your cache!</div>;
}
```

---

## API

### Store & Retrieve Data

```tsx
// JSON
await cache.put('user-profile', { name: 'Alice' });
const user = await cache.get('user-profile');

// HTML
await cache.putHTML('offline-page', '<h1>Offline</h1>');
const html = await cache.getHTML('offline-page');

// File
await cache.putFile('upload-image', fileInput.files[0]);
const file = await cache.getFile('upload-image');

// Blob
await cache.putBlob('my-blob', someBlob);
const blob = await cache.getBlob('my-blob');

// ArrayBuffer
await cache.putArrayBuffer('raw-data', myArrayBuffer);
const buffer = await cache.getArrayBuffer('raw-data');
```

### TTL (Time-To-Live)

```tsx
// Save with 1 hour TTL (in seconds)
await cache.put('user/settings', { theme: 'dark' }, 60 * 60);

// Automatically returns undefined if expired
const settings = await cache.get('user/settings');
```

### `getOrSet` — Fetch on Cache Miss

```tsx
// Returns cached value, or calls fetcher, caches the result, and returns it
const user = await cache.getOrSet('user-profile', async () => {
  const res = await fetch('/api/user');
  return res.json();
}, 3600);
```

### Metadata Inspection

```tsx
const meta = await cache.getMeta('user-profile');
// { key: 'user-profile', createdAt: 1710000000000, ttl: 3600 }
```

### Query & Select

```tsx
// Select all items in a namespace
const imageKeys = await cache.select((key) => key.startsWith('images/'));

// Select by metadata
const recentKeys = await cache.select((key, meta) => {
  return Date.now() - meta.createdAt < 60 * 60 * 1000; // last hour
});
```

### Other Operations

```tsx
await cache.has('key');        // boolean
await cache.delete('key');     // remove entry
await cache.keys();            // all non-expired keys
await cache.size();            // count of non-expired keys
await cache.clear();           // delete entire cache bucket
```