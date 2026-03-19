```tsx
# Events

A lightweight React hook for cross-component communication using the browser's native `CustomEvent` API. No state management library needed.

## Features

- **Type-safe** – generic payload types via `useReactEvent<EventKey, T>`
- **Stable references** – all returned functions are memoized (`useCallback` / `useMemo`)
- **Debounced emit** – built-in debounce support with configurable delay
- **Fire-once** – `emitOnce` ensures the event fires at most once
- **Auto-cleanup** – `listen` returns an unsubscribe function for use in `useEffect`

---

## Installation

```tsx
import { useReactEvent } from '@enjoys/react-api/events';
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
  const { emit } = useReactEvent<MyEvents, { reason: string }>(MyEvents.USER_LOGOUT);

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
  const { listen } = useReactEvent<MyEvents, { reason: string }>(MyEvents.USER_LOGOUT);

  useEffect(() => {
    const unsubscribe = listen((data) => {
      console.log('User logged out:', data);
    });
    return unsubscribe;
  }, [listen]);

  return <div>Listening...</div>;
}
```

---

## API Reference

### `useReactEvent<EventKey, T>(eventKey, debounceDelay?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `eventKey` | `string` | — | The event name to emit / listen on |
| `debounceDelay` | `number` | `300` | Debounce delay in ms for `emitDebounced` |

#### Returned Methods

| Method | Signature | Description |
|---|---|---|
| `emit` | `(payload?: T) => void` | Dispatch the event with an optional payload |
| `emitOnce` | `(payload?: T) => void` | Dispatch the event only the first time it's called |
| `emitDebounced` | `(payload?: T) => void` | Debounced version of `emit` (configurable delay) |
| `listen` | `(handler: (data: T) => void) => () => void` | Subscribe to the event; returns an unsubscribe function |
| `listenOnce` | `(handler: (data: T) => void) => void` | Subscribe once — auto-removes after first invocation |

---

## Advanced Examples

### Debounced Search Input

```tsx
function SearchInput() {
  const { emitDebounced } = useReactEvent<string, string>('search:query', 500);

  return <input onChange={(e) => emitDebounced(e.target.value)} />;
}

function SearchResults() {
  const { listen } = useReactEvent<string, string>('search:query');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const unsub = listen(setQuery);
    return unsub;
  }, [listen]);

  return <div>Results for: {query}</div>;
}
```

### Fire-Once Initialization

```tsx
function InitTracker() {
  const { emitOnce } = useReactEvent('app:init');

  useEffect(() => {
    emitOnce({ timestamp: Date.now() });
  }, [emitOnce]);

  return null;
}
```