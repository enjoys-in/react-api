```tsx
# Events

A lightweight, SSR-safe React hook for cross-component communication using the browser's native `CustomEvent` API. No state management library needed.

## Features

- **Type-safe** – `EventMap` registry pattern enforces payload types across emitters and listeners
- **SSR-safe** – all browser APIs are guarded; works in Next.js, Remix, etc.
- **Stable references** – all returned functions are memoized (`useCallback` / `useMemo`)
- **Debounced emit** – built-in debounce with `.cancel()` support and auto-cleanup on unmount
- **Fire-once** – `emitOnce` fires at most once, with `resetOnce()` to re-arm
- **Namespace support** – prefix event keys to avoid collisions across modules
- **Auto-subscribe** – `useEventListener` eliminates `useEffect` boilerplate
- **Leak-free** – `listenOnce` returns an unsubscribe function for safe cleanup

---

## Installation

```tsx
import { useReactEvent, useEventListener } from '@enjoys/react-api/events';
```

---

## Quick Start

### Define Event Keys

```tsx
enum MyEvents {
  USER_LOGOUT = 'user:logout',
  THEME_CHANGE = 'theme:change',
}
```

### Emitting Events

```tsx
import { useReactEvent } from '@enjoys/react-api/events';

export default function EmitterComponent() {
  const { emit } = useReactEvent('user:logout');

  return (
    <>
      <button onClick={() => emit()}>Logout (no payload)</button>
      <button onClick={() => emit({ reason: 'manual' })}>Logout (with reason)</button>
    </>
  );
}
```

### Listening for Events

```tsx
import { useReactEvent } from '@enjoys/react-api/events';

export default function ListenerComponent() {
  const { listen } = useReactEvent('user:logout');

  useEffect(() => {
    const unsubscribe = listen((data) => {
      console.log('User logged out:', data);
    });
    return unsubscribe;
  }, [listen]);

  return <div>Listening...</div>;
}
```

### Auto-Subscribe (zero boilerplate)

```tsx
import { useEventListener } from '@enjoys/react-api/events';

export default function ListenerComponent() {
  useEventListener('user:logout', (data) => {
    console.log('User logged out:', data);
  });

  return <div>Listening...</div>;
}
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
| `emitOnce` | `(payload?: T) => void` | Dispatch the event only the first time it's called |
| `emitDebounced` | `(payload?: T) => void` | Debounced emit with `.cancel()` method; auto-cancels on unmount |
| `listen` | `(handler: (data: T) => void) => () => void` | Subscribe to the event; returns an unsubscribe function |
| `listenOnce` | `(handler: (data: T) => void) => () => void` | Subscribe once — auto-removes after first call; returns unsubscribe |
| `resetOnce` | `() => void` | Re-arms `emitOnce` so it can fire again |

### `useEventListener<Map, K>(eventKey, handler, options?)`

Auto-subscribes on mount and cleans up on unmount. No return value needed.

| Parameter | Type | Description |
|---|---|---|
| `eventKey` | `string` | The event name to listen on |
| `handler` | `(data: T) => void` | Callback invoked with the event payload |
| `options.namespace` | `string` | Optional namespace prefix |

---

## Typed Event Registry (`EventMap`)

For full type safety across your app, define an `EventMap` and pass it as a generic:

```tsx
import { useReactEvent, useEventListener, type EventMap } from '@enjoys/react-api/events';

interface AppEvents extends EventMap {
  'user:logout': { reason: string };
  'theme:change': 'light' | 'dark';
  'search:query': string;
}

// Emitter — payload is typed as { reason: string }
const { emit } = useReactEvent<AppEvents, 'user:logout'>('user:logout');
emit({ reason: 'manual' }); // ✅ typed
emit('wrong');               // ❌ TypeScript error

// Listener — handler receives the correct type
useEventListener<AppEvents, 'theme:change'>('theme:change', (theme) => {
  document.body.className = theme; // theme: 'light' | 'dark'
});
```

---

## Namespace Support

Prevent event key collisions in large apps by adding a namespace:

```tsx
// Sidebar module
const { emit } = useReactEvent('click', { namespace: 'sidebar' });
// Dispatches event: "sidebar:click"

// Header module
const { emit } = useReactEvent('click', { namespace: 'header' });
// Dispatches event: "header:click"

// Listen to sidebar clicks only
useEventListener('click', handler, { namespace: 'sidebar' });
```

---

## Advanced Examples

### Debounced Search Input

```tsx
function SearchInput() {
  const { emitDebounced } = useReactEvent('search:query', { debounceDelay: 500 });

  return <input onChange={(e) => emitDebounced(e.target.value)} />;
}

function SearchResults() {
  const [query, setQuery] = useState('');
  useEventListener('search:query', setQuery);

  return <div>Results for: {query}</div>;
}
```

### Cancel Debounce Manually

```tsx
const { emitDebounced } = useReactEvent('save:draft', { debounceDelay: 1000 });

// Cancel any pending debounced save
emitDebounced.cancel();
```

### Fire-Once with Reset

```tsx
function InitTracker() {
  const { emitOnce, resetOnce } = useReactEvent('app:init');

  useEffect(() => {
    emitOnce({ timestamp: Date.now() });
  }, [emitOnce]);

  // Re-arm so it can fire again (e.g., after re-login)
  const reinitialize = () => {
    resetOnce();
    emitOnce({ timestamp: Date.now() });
  };

  return <button onClick={reinitialize}>Re-init</button>;
}
```

### Safe listenOnce Cleanup

```tsx
function OneTimeAlert() {
  const { listenOnce } = useReactEvent('alert:show');

  useEffect(() => {
    const unsubscribe = listenOnce((data) => {
      alert(data.message);
    });
    return unsubscribe; // safe cleanup if component unmounts before event fires
  }, [listenOnce]);

  return null;
}
```