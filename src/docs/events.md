# Events

A lightweight, SSR-safe React hook for cross-component communication using the browser's native `CustomEvent` API. No state management library needed.

## Features

- **Type-safe** – `EventMap` registry pattern enforces payload types across emitters and listeners
- **SSR-safe** – all browser APIs are guarded; works in Next.js, Remix, etc.
- **Stable references** – all returned functions are memoized (`useCallback` / `useMemo`)
- **Debounced emit** – built-in debounce with `.cancel()` support and auto-cleanup on unmount
- **Fire-once** – `emitOnce` fires at most once, with `resetOnce()` to re-arm; auto-resets on key change
- **Namespace support** – prefix event keys to avoid collisions across modules
- **Auto-subscribe** – `useEventListener` eliminates `useEffect` boilerplate
- **Leak-free** – `listenOnce` returns an unsubscribe function with double-call guard

---

## Installation

```tsx
import { useReactEvent, useEventListener } from '@enjoys/react-api/events';
```

---

## API Reference

### `useReactEvent<Map, K>(eventKey, options?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `eventKey` | `string` | — | The event name to emit / listen on |
| `options.namespace` | `string` | — | Prefix added to the event key (`namespace:eventKey`) |
| `options.debounceDelay` | `number` | `300` | Debounce delay in ms for `emitDebounced` |

#### Returned Methods

| Method | Signature | Description |
|---|---|---|
| `emit` | `(payload?: T) => void` | Dispatch the event with an optional payload |
| `emitOnce` | `(payload?: T) => void` | Dispatch only the first time; auto-resets on key change |
| `emitDebounced` | `DebouncedFn<T>` | Debounced emit; has `.cancel()` method; auto-cancels on unmount |
| `listen` | `(handler) => () => void` | Subscribe to the event; returns an unsubscribe function |
| `listenOnce` | `(handler) => () => void` | Subscribe once; auto-removes after first call; returns unsubscribe for early cleanup |
| `resetOnce` | `() => void` | Manually re-arms `emitOnce` so it can fire again |

### `useEventListener<Map, K>(eventKey, handler, options?)`

Auto-subscribes on mount and cleans up on unmount. Uses a ref internally so the latest handler is always called — no stale closure issues.

| Parameter | Type | Description |
|---|---|---|
| `eventKey` | `string` | The event name to listen on |
| `handler` | `(data: T) => void` | Callback invoked with the event payload |
| `options.namespace` | `string` | Optional namespace prefix |

### Exported Types

| Type | Description |
|---|---|
| `EventMap` | Base type for typed event registries (`Record<string, any>`) |
| `UseReactEventOptions` | Options for `useReactEvent` (`namespace`, `debounceDelay`) |
| `UseEventListenerOptions` | Options for `useEventListener` (`namespace` only) |
| `UseReactEventReturn<T>` | Return type of `useReactEvent` |

---

## Examples

### 1. Basic Emit & Listen

```tsx
import { useReactEvent } from '@enjoys/react-api/events';

// Component A: Emitter
function NotifyButton() {
  const { emit } = useReactEvent('notification');

  return (
    <button onClick={() => emit({ title: 'Hello', body: 'World' })}>
      Notify
    </button>
  );
}

// Component B: Listener
function NotificationBanner() {
  const { listen } = useReactEvent('notification');
  const [msg, setMsg] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const unsub = listen((data) => setMsg(data));
    return unsub;
  }, [listen]);

  if (!msg) return null;
  return <div>{msg.title}: {msg.body}</div>;
}
```

---

### 2. Auto-Subscribe with `useEventListener`

No `useEffect` needed — subscribes on mount, cleans up on unmount:

```tsx
import { useEventListener } from '@enjoys/react-api/events';

function Logger() {
  useEventListener('notification', (data) => {
    console.log('Received:', data);
  });

  return <div>Logging events...</div>;
}
```

---

### 3. Typed EventMap (Full Type Safety)

Define an event registry once, get typed payloads everywhere:

```tsx
import { useReactEvent, useEventListener, type EventMap } from '@enjoys/react-api/events';

// Define once, share across your app
interface AppEvents extends EventMap {
  'user:login': { userId: string; role: 'admin' | 'user' };
  'user:logout': { reason: string };
  'theme:change': 'light' | 'dark';
  'cart:update': { itemCount: number };
  'search:query': string;
}

// Emitter — fully typed payload
function LoginButton() {
  const { emit } = useReactEvent<AppEvents, 'user:login'>('user:login');

  return (
    <button onClick={() => emit({ userId: 'abc', role: 'admin' })}>
      Login
    </button>
  );
}

// Listener — handler param is typed as { userId: string; role: 'admin' | 'user' }
function UserTracker() {
  useEventListener<AppEvents, 'user:login'>('user:login', (data) => {
    console.log(`${data.userId} logged in as ${data.role}`);
  });

  return null;
}

// Theme listener — param is typed as 'light' | 'dark'
function ThemeApplier() {
  useEventListener<AppEvents, 'theme:change'>('theme:change', (theme) => {
    document.documentElement.dataset.theme = theme;
  });

  return null;
}
```

---

### 4. Namespace Support

Avoid event key collisions across modules in large apps:

```tsx
// Sidebar module — dispatches "sidebar:toggle"
function SidebarToggle() {
  const { emit } = useReactEvent('toggle', { namespace: 'sidebar' });
  return <button onClick={() => emit()}>Toggle Sidebar</button>;
}

// Header module — dispatches "header:toggle"
function HeaderMenuToggle() {
  const { emit } = useReactEvent('toggle', { namespace: 'header' });
  return <button onClick={() => emit()}>Toggle Menu</button>;
}

// Only listens to "sidebar:toggle", ignores "header:toggle"
function SidebarPanel() {
  useEventListener('toggle', () => {
    console.log('Sidebar toggled!');
  }, { namespace: 'sidebar' });

  return <aside>Sidebar content</aside>;
}
```

---

### 5. Debounced Emit

Built-in debounce with configurable delay — perfect for search inputs, auto-save, etc.:

```tsx
function SearchInput() {
  const { emitDebounced } = useReactEvent('search:query', { debounceDelay: 500 });

  return (
    <input
      placeholder="Search..."
      onChange={(e) => emitDebounced(e.target.value)}
    />
  );
}

function SearchResults() {
  const [query, setQuery] = useState('');
  useEventListener('search:query', setQuery);

  return <div>Showing results for: {query}</div>;
}
```

#### Cancel Debounce Manually

```tsx
function AutoSave() {
  const { emitDebounced } = useReactEvent('save:draft', { debounceDelay: 2000 });

  const handleChange = (text: string) => {
    emitDebounced(text);
  };

  const handleManualSave = () => {
    emitDebounced.cancel(); // Cancel pending auto-save
    // Trigger immediate save logic instead
  };

  return (
    <>
      <textarea onChange={(e) => handleChange(e.target.value)} />
      <button onClick={handleManualSave}>Save Now</button>
    </>
  );
}
```

---

### 6. Fire-Once with Reset

`emitOnce` fires the event at most once. Use `resetOnce` to re-arm:

```tsx
function AppInit() {
  const { emitOnce } = useReactEvent('app:initialized');

  useEffect(() => {
    // Only fires once, even if the component re-renders
    emitOnce({ timestamp: Date.now() });
  }, [emitOnce]);

  return null;
}
```

#### Re-arm After User Action

```tsx
function SessionManager() {
  const { emitOnce, resetOnce } = useReactEvent('session:started');

  const startSession = () => {
    emitOnce({ at: Date.now() });
  };

  const endAndRestart = () => {
    resetOnce();           // Re-arm so next call goes through
    startSession();        // Fires again
  };

  return (
    <>
      <button onClick={startSession}>Start Session</button>
      <button onClick={endAndRestart}>Restart Session</button>
    </>
  );
}
```

#### Auto-Resets on Key Change

If the event key changes (e.g., dynamic route), `emitOnce` automatically resets:

```tsx
function PageTracker({ pageId }: { pageId: string }) {
  const { emitOnce } = useReactEvent(`page:${pageId}:viewed`);

  useEffect(() => {
    // Fires once per unique pageId — resets automatically when pageId changes
    emitOnce({ pageId, viewedAt: Date.now() });
  }, [emitOnce, pageId]);

  return null;
}
```

---

### 7. Safe `listenOnce` Cleanup

`listenOnce` auto-removes after the first event, but also returns an unsubscribe function for early cleanup if the component unmounts before the event fires:

```tsx
function WelcomeToast() {
  const { listenOnce } = useReactEvent('user:login');

  useEffect(() => {
    const unsubscribe = listenOnce((data) => {
      showToast(`Welcome, ${data.name}!`);
    });
    return unsubscribe; // Clean up if component unmounts before login event
  }, [listenOnce]);

  return null;
}
```

---

### 8. Cross-Component Communication (Full Example)

A complete shopping cart example using multiple features together:

```tsx
import { useReactEvent, useEventListener, type EventMap } from '@enjoys/react-api/events';

interface ShopEvents extends EventMap {
  'cart:add': { productId: string; quantity: number };
  'cart:remove': { productId: string };
  'cart:clear': undefined;
}

// Product card emits add-to-cart
function ProductCard({ id, name }: { id: string; name: string }) {
  const { emit } = useReactEvent<ShopEvents, 'cart:add'>('cart:add');

  return (
    <div>
      <h3>{name}</h3>
      <button onClick={() => emit({ productId: id, quantity: 1 })}>
        Add to Cart
      </button>
    </div>
  );
}

// Cart badge listens and updates count
function CartBadge() {
  const [count, setCount] = useState(0);

  useEventListener<ShopEvents, 'cart:add'>('cart:add', (data) => {
    setCount((c) => c + data.quantity);
  });

  useEventListener<ShopEvents, 'cart:remove'>('cart:remove', () => {
    setCount((c) => Math.max(0, c - 1));
  });

  useEventListener<ShopEvents, 'cart:clear'>('cart:clear', () => {
    setCount(0);
  });

  return <span>Cart ({count})</span>;
}

// Clear button
function ClearCartButton() {
  const { emit } = useReactEvent<ShopEvents, 'cart:clear'>('cart:clear');
  return <button onClick={() => emit(undefined)}>Clear Cart</button>;
}
```

---

### 9. Emit Without Payload

Events work fine without any payload:

```tsx
function RefreshButton() {
  const { emit } = useReactEvent('data:refresh');
  return <button onClick={() => emit()}>Refresh</button>;
}

function DataPanel() {
  useEventListener('data:refresh', () => {
    console.log('Refreshing data...');
    // re-fetch logic
  });

  return <div>Data panel</div>;
}
```

---

### 10. Multiple Listeners on Same Event

Multiple components can listen to the same event independently:

```tsx
function AnalyticsTracker() {
  useEventListener('user:logout', (data) => {
    analytics.track('logout', data);
  });
  return null;
}

function SessionCleanup() {
  useEventListener('user:logout', () => {
    localStorage.clear();
  });
  return null;
}

function LogoutRedirect() {
  useEventListener('user:logout', () => {
    window.location.href = '/login';
  });
  return null;
}
```

---

### 11. Conditional Listening

Combine with state to conditionally process events:

```tsx
function ConditionalLogger({ enabled }: { enabled: boolean }) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEventListener('debug:log', (data) => {
    if (enabledRef.current) {
      console.log('[DEBUG]', data);
    }
  });

  return null;
}
```

---

### 12. Next.js / SSR Usage

All functions are SSR-safe — they silently no-op on the server:

```tsx
// Works in Next.js App Router (Server Components won't call hooks, Client Components are safe)
'use client';

import { useReactEvent, useEventListener } from '@enjoys/react-api/events';

export function ClientSideEmitter() {
  const { emit } = useReactEvent('page:loaded');

  useEffect(() => {
    emit({ url: window.location.href });
  }, [emit]);

  return null;
}
```