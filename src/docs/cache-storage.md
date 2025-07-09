A powerful, flexible React utility and hook for working with the Cache Storage API — with full support for:

✅ Files, Blobs, JSON, HTML, ArrayBuffer, and Text

✅ Custom cache names and namespaces

✅ Entry TTL (expiry support)

✅ Metadata tracking

✅ Query selectors (e.g., .where, .select)

✅ Blazing-fast read/write/delete operations

✅ Built-in React Context + Hook

Features
🧠 React Hook API – use cache storage anywhere in your components

🗃️ File-safe – supports binary types like Blob, ArrayBuffer, and File

📦 Namespaced caches – create isolated buckets by name

⏳ TTL Expiry – automatic expiration support with timestamps

🎯 Flexible queries – filter or select items using .where() and .select()

💾 Smart metadata – access created/updated timestamps, type, and size

```tsx
import { CacheProvider, useCache } from '@enjoys/react-api/dist/cache-storage';

function App() {
  return (
    <CacheProvider cacheName="my-app-cache">
      <YourComponent />
    </CacheProvider>
  );
}

function YourComponent() {
  const cache = useCache();
  const { put, get, remove, list, where, clear } = cache

  useEffect(() => {
    put('my-key', { name: 'John' }, { ttl: 3600 });
  }, []);

  return <div>Check your cache!</div>;
}



// Save JSON
await cache.put('user-profile', { name: 'Alice' });

// Save a file
await cache.putFile('upload-image', fileInput.files[0]);

// Save ArrayBuffer (e.g. from WebSocket or binary data)
await cache.putArrayBuffer('raw-data', myArrayBuffer);

// Save HTML
await cache.putHTML('offline-page', '<h1>Offline</h1>');

// Load back
const user = await cache.get('user-profile');
const buffer = await cache.getArrayBuffer('raw-data');
const html = await cache.getHTML('offline-page');

// Save JSON with 1 hour TTL
await cache.put('user/settings', { theme: 'dark' }, 60 * 60);

// Save image in namespace
await cache.putFile('images/avatar', file);

// Check expiration
const user = await cache.get('user/settings'); // returns null if expired

// Select all items in a namespace
const imageKeys = await cache.select(key => key.startsWith('images/'));

// Select all expired (manually)
const expired = await cache.select((key, meta) => {
  return meta.ttl && Date.now() - meta.createdAt > meta.ttl * 1000;
});

```