import React, { useEffect, useState } from 'react';
import { useCache } from './hooks/useCache';

export default function ExampleComponent() {
  const cache = useCache('images');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const cached = await cache.getFile('avatar');
      if (cached) {
        console.log('Loaded from cache:', cached.name);
      }
    })();
  }, []);

  const upload = async () => {
    if (file) {
      await cache.putFile('avatar', file, 3600); // cache 1 hour
      alert('File saved to cache!');
    }
  };

  const listKeys = async () => {
    const keys = await cache.keys();
    console.log('Cached keys:', keys);
  };

  return (
    <div className="p-4">
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={upload}>Save File</button>
      <button onClick={listKeys}>List Cached Files</button>
    </div>
  );
}
