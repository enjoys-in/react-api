// App.tsx
import  { useEffect } from 'react';
import { CacheProvider, useCache } from './context/CacheContext';

const DemoComponent = () => {
  const cache = useCache();

  useEffect(() => {
    const run = async () => {
      await cache.put('/test', { message: 'Hello Cache!' });
      const data = await cache.get('/test');
      console.log('From Cache:', data);

      const allKeys = await cache.keys();
      console.log('All cache keys:', allKeys);
    };
    run();
  }, [cache]);

  return <div>Check console for cache test</div>;
};

export default function App() {
  return (
    <CacheProvider>
      <DemoComponent />
    </CacheProvider>
  );
}
