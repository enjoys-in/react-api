# Broadcast Channel (Cross-Tab Synchronization)

A lightweight, SSR-safe React hook suite for cross-tab, cross-window, and cross-worker communication using the browser's native `BroadcastChannel` API. Keep state, actions, and events in sync across browser tabs with zero external dependencies.

## Features

- **Cross-tab sync** – real-time communication between browser tabs, windows, iframes, and Web Workers on the same origin
- **Type-safe** – `BroadcastEventMap` registry pattern enforces payload types across emitters and listeners
- **SSR-safe** – all browser APIs are guarded; works seamlessly in Next.js App Router, Remix, and Gatsby
- **Resource-efficient** – single ref-counted native `BroadcastChannel` multiplexer per channel name; automatically closes when all components unmount
- **Stable references** – all returned functions are memoized (`useCallback` / `useMemo`) to prevent unwanted re-renders
- **Debounced emit** – built-in debounce with `.cancel()` support and auto-cleanup on unmount
- **Fire-once** – `postMessageOnce` / `emitOnce` fires at most once, with `resetOnce()` to re-arm; auto-resets on channel name change
- **Namespace support** – prefix channel names to avoid collisions across modules
- **Intra-tab + inter-tab** – optional `includeSelf: true` flag allows broadcasting to other tabs AND local listeners simultaneously
- **Auto-subscribe** – `useBroadcastListener` eliminates `useEffect` boilerplate
- **Real-time state sync** – `useBroadcastState` provides a `useState`-like hook synchronized across all open tabs
- **Leak-free** – `listenOnce` returns an unsubscribe function with double-call guard

---

## Installation

```tsx
import {
  useBroadcastChannel,
  useBroadcastListener,
  useBroadcastState,
  useReactBroadcast,
  isBroadcastChannelSupported,
} from '@enjoys/react-api/broadcast';

```

---

## API Reference

### `useBroadcastChannel<Map, K>(channelName, options?)`

The primary hook for managing a broadcast channel. Provides methods to post messages, listen for incoming messages from other tabs, debounce broadcasts, and manage channel lifecycle.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `channelName` | `string` | — | The channel name to broadcast / listen on |
| `options.namespace` | `string` | — | Prefix added to channel name (`namespace:channelName`) |
| `options.debounceDelay` | `number` | `300` | Debounce delay in ms for `postMessageDebounced` / `emitDebounced` |
| `options.includeSelf` | `boolean` | `false` | When `true`, messages are also dispatched to listeners in the current tab |

#### Returned Methods & Properties

| Method / Property | Signature | Description |
|---|---|---|
| `postMessage` | `(payload?: T, options?: PostMessageCallOptions) => void` | Broadcast a message to other tabs (and current tab if `includeSelf` is enabled) |
| `emit` | `(payload?: T, options?: PostMessageCallOptions) => void` | Alias for `postMessage` (matches `useReactEvent` API) |
| `postMessageOnce` | `(payload?: T, options?: PostMessageCallOptions) => void` | Broadcast only once; auto-resets on channel name change or via `resetOnce` |
| `emitOnce` | `(payload?: T, options?: PostMessageCallOptions) => void` | Alias for `postMessageOnce` |
| `postMessageDebounced` | `DebouncedFn<T>` | Debounced broadcast; includes `.cancel()` method; auto-cancels on unmount |
| `emitDebounced` | `DebouncedFn<T>` | Alias for `postMessageDebounced` |
| `listen` | `(handler: (data: T) => void) => () => void` | Subscribe to messages on this channel; returns an unsubscribe function |
| `listenOnce` | `(handler: (data: T) => void) => () => void` | Subscribe once; auto-removes after first message; returns unsubscribe for early cleanup |
| `resetOnce` | `() => void` | Manually re-arms `postMessageOnce` / `emitOnce` so it can fire again |
| `close` | `() => void` | Explicitly closes the channel connection for this channel name |
| `isSupported` | `boolean` | `true` if `BroadcastChannel` is supported in the current environment, `false` otherwise |
| `channel` | `BroadcastChannel \| null` | The underlying native `BroadcastChannel` instance (null on server or if unsupported) |

---

### `useBroadcastListener<Map, K>(channelName, handler, options?)`

Auto-subscribing listener hook — eliminates `useEffect` boilerplate. Automatically connects on mount and disconnects on unmount. Uses a ref internally so the latest handler is always called without stale closure bugs.

| Parameter | Type | Description |
|---|---|---|
| `channelName` | `string` | The channel name to listen on |
| `handler` | `(data: T) => void` | Callback invoked with the message payload from other tabs |
| `options.namespace` | `string` | Optional namespace prefix (`namespace:channelName`) |

---

### `useBroadcastState<T, Map, K>(channelName, initialValue?, options?)`

A reactive state hook that synchronizes state across all browser tabs in real-time. Behaves like standard `React.useState`, but whenever state changes in one tab, all other tabs update instantly.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `channelName` | `string` | — | The channel name used to synchronize state |
| `initialValue` | `T \| (() => T)` | `undefined` | Initial state value or lazy initializer function |
| `options.namespace` | `string` | — | Optional namespace prefix |
| `options.debounceDelay` | `number` | `0` | Debounce delay in ms before broadcasting (ideal for sliders/text inputs) |
| `options.syncLocal` | `boolean` | `true` | Also update other components using `useBroadcastState` within the same tab |

**Returns:** `[state, setBroadcastState]` tuple, exactly like `React.useState`. Supports function updates `setBroadcastState(prev => ...)`.

---

### `isBroadcastChannelSupported()`

Standalone utility function to test if the browser environment supports `BroadcastChannel`.

```ts
import { isBroadcastChannelSupported } from '@enjoys/react-api/broadcast';

if (isBroadcastChannelSupported()) {
  console.log('Cross-tab synchronization available');
}
```

---

### Exported Types

| Type | Description |
|---|---|
| `BroadcastEventMap` | Base type for typed channel registries (`Record<string, any>`) |
| `BroadcastMap` | Alias for `BroadcastEventMap` |
| `UseBroadcastChannelOptions` | Configuration options for `useBroadcastChannel` |
| `UseBroadcastListenerOptions` | Configuration options for `useBroadcastListener` |
| `UseBroadcastStateOptions` | Configuration options for `useBroadcastState` |
| `UseBroadcastChannelReturn<T>` | Return object of `useBroadcastChannel` |
| `PostMessageCallOptions` | Per-call options for `postMessage` / `emit` (`includeSelf`) |
| `DebouncedFn<T>` | Debounced function interface with `.cancel()` |

---

## Examples

### 1. Basic Cross-Tab Emit & Listen

Open your web app in two different tabs. Trigger the button in Tab 1, and Tab 2 receives the notification immediately:

```tsx
import { useState, useEffect } from 'react';
import { useBroadcastChannel } from '@enjoys/react-api/broadcast';

// Tab A: Broadcaster
function AnnounceButton() {
  const { emit } = useBroadcastChannel('announcements');

  return (
    <button onClick={() => emit({ text: 'Hello from Tab A!', time: Date.now() })}>
      Broadcast to Other Tabs
    </button>
  );
}

// Tab B: Listener
function AnnouncementBanner() {
  const { listen } = useBroadcastChannel('announcements');
  const [notice, setNotice] = useState<{ text: string; time: number } | null>(null);

  useEffect(() => {
    const unsubscribe = listen((data) => setNotice(data));
    return unsubscribe;
  }, [listen]);

  if (!notice) return null;
  return <div>{notice.text} (sent at {new Date(notice.time).toLocaleTimeString()})</div>;
}
```

---

### 2. Auto-Subscribe with `useBroadcastListener`

No `useEffect` or manual unsubscribe needed — subscribes on mount and cleans up on unmount:

```tsx
import { useBroadcastListener } from '@enjoys/react-api/broadcast';

function SystemAlertReceiver() {
  useBroadcastListener('system:alert', (alert) => {
    console.log('Alert received across tabs:', alert.message);
  });

  return <div>Listening for cross-tab alerts...</div>;
}
```

---

### 3. Cross-Tab State Synchronization (`useBroadcastState`)

Synchronize reactive state across all open tabs as easily as `useState`:

```tsx
import { useBroadcastState } from '@enjoys/react-api/broadcast';

function ThemeSelector() {
  const [theme, setTheme] = useBroadcastState<'light' | 'dark'>('app:theme', 'light');

  const toggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div style={{ background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}>
      <p>Current Theme: {theme}</p>
      <button onClick={toggle}>Toggle Theme Across All Tabs</button>
    </div>
  );
}
```

---

### 4. Typed `BroadcastEventMap` (Full Type Safety)

Define your message schema once and get end-to-end type safety across emitters and listeners:

```tsx
import {
  useBroadcastChannel,
  useBroadcastListener,
  type BroadcastEventMap,
} from '@enjoys/react-api/broadcast';

// 1. Define your multi-tab event contract
interface AppChannels extends BroadcastEventMap {
  'auth:logout': { userId: string; reason: string };
  'cart:sync': { itemCount: number; total: number };
  'doc:updated': { docId: string; modifiedBy: string };
}

// 2. Emitter — TypeScript checks the payload type
function HeaderLogout() {
  const { emit } = useBroadcastChannel<AppChannels, 'auth:logout'>('auth:logout');

  const handleLogout = () => {
    emit({ userId: 'usr_123', reason: 'user_signout' });
  };

  return <button onClick={handleLogout}>Log Out</button>;
}

// 3. Listener — data parameter is strongly typed
function SessionWatcher() {
  useBroadcastListener<AppChannels, 'auth:logout'>('auth:logout', (data) => {
    console.log(`User ${data.userId} logged out due to: ${data.reason}`);
    window.location.href = '/login';
  });

  return null;
}
```

---

### 5. Intra-Tab + Inter-Tab Communication (`includeSelf`)

By default, `BroadcastChannel` sends messages only to *other* tabs. Enable `includeSelf: true` to notify listeners in the current tab as well:

```tsx
import { useBroadcastChannel, useBroadcastListener } from '@enjoys/react-api/broadcast';

// Broadcast to other tabs AND local listeners in this tab
function GlobalNotifier() {
  const { emit } = useBroadcastChannel('notifications', { includeSelf: true });

  return (
    <button onClick={() => emit({ text: 'Sync everywhere!' })}>
      Notify All Tabs (Including This One)
    </button>
  );
}

// Can also be toggled per-message:
function DynamicNotifier() {
  const { emit } = useBroadcastChannel('notifications');

  return (
    <>
      {/* Sent only to other tabs */}
      <button onClick={() => emit({ text: 'Other tabs only' })}>
        Other Tabs Only
      </button>

      {/* Sent to other tabs AND this tab */}
      <button onClick={() => emit({ text: 'All tabs' }, { includeSelf: true })}>
        Include Current Tab
      </button>
    </>
  );
}
```

---

### 6. Namespace Support

Avoid channel collisions across separate modules or micro-frontends:

```tsx
import { useBroadcastChannel, useBroadcastListener } from '@enjoys/react-api/broadcast';

// Module A: Dispatches on "billing:refresh"
function PaymentComplete() {
  const { emit } = useBroadcastChannel('refresh', { namespace: 'billing' });
  return <button onClick={() => emit({ invoiceId: 'inv_999' })}>Payment Done</button>;
}

// Module B: Dispatches on "analytics:refresh"
function AnalyticsUpdate() {
  const { emit } = useBroadcastChannel('refresh', { namespace: 'analytics' });
  return <button onClick={() => emit({ reportId: 'rep_123' })}>Update Report</button>;
}

// Listener only receives billing refreshes
function BillingDashboard() {
  useBroadcastListener('refresh', (data) => {
    console.log('Reloading billing data for invoice:', data.invoiceId);
  }, { namespace: 'billing' });

  return <div>Billing Dashboard</div>;
}
```

---

### 7. Debounced Cross-Tab Emit

Debounce frequent operations like search filters, live text typing, or slider updates so they don't flood cross-tab IPC:

```tsx
import { useState } from 'react';
import { useBroadcastChannel, useBroadcastListener } from '@enjoys/react-api/broadcast';

function SharedSearchBar() {
  const { emitDebounced } = useBroadcastChannel('search:query', { debounceDelay: 400 });

  return (
    <input
      type="text"
      placeholder="Type to search in all tabs..."
      onChange={(e) => emitDebounced(e.target.value)}
    />
  );
}

function SearchResultsWatcher() {
  const [query, setQuery] = useState('');

  useBroadcastListener('search:query', (incomingQuery) => {
    setQuery(incomingQuery);
  });

  return <div>Active search in other tab: {query}</div>;
}
```

#### Cancelling Pending Debounced Broadcasts

```tsx
function FormEditor() {
  const { emitDebounced } = useBroadcastChannel('editor:draft', { debounceDelay: 2000 });

  const handleChange = (content: string) => {
    emitDebounced(content);
  };

  const handleImmediateSubmit = (content: string) => {
    emitDebounced.cancel(); // Cancel pending delayed broadcast
    // Send final state immediately
  };

  return <textarea onChange={(e) => handleChange(e.target.value)} />;
}
```

---

### 8. Fire-Once Cross-Tab Sync (`emitOnce` / `postMessageOnce`)

Emit a message across tabs at most once. Use `resetOnce` to re-arm:

```tsx
import { useEffect } from 'react';
import { useBroadcastChannel } from '@enjoys/react-api/broadcast';

function InitialTabCheck() {
  const { emitOnce } = useBroadcastChannel('app:primary-tab');

  useEffect(() => {
    // Only fires once, even if component re-renders
    emitOnce({ tabId: window.name || 'main', startedAt: Date.now() });
  }, [emitOnce]);

  return null;
}
```

#### Re-arming After Action

```tsx
function BackupManager() {
  const { emitOnce, resetOnce } = useBroadcastChannel('backup:started');

  const startBackup = () => {
    emitOnce({ timestamp: Date.now() });
  };

  const resetAndRestart = () => {
    resetOnce(); // Re-arm so next call goes through
    startBackup();
  };

  return (
    <>
      <button onClick={startBackup}>Start Backup</button>
      <button onClick={resetAndRestart}>Restart Backup</button>
    </>
  );
}
```

---

### 9. Safe `listenOnce` Cleanup

`listenOnce` automatically unregisters after receiving the first message. It also returns an unsubscribe function if the component unmounts before a message arrives:

```tsx
import { useEffect } from 'react';
import { useBroadcastChannel } from '@enjoys/react-api/broadcast';

function OneTimeOfferBanner() {
  const { listenOnce } = useBroadcastChannel('promo:claimed');

  useEffect(() => {
    const unsubscribe = listenOnce((data) => {
      alert(`Promo claimed in another tab by user: ${data.user}`);
    });

    // Cleanup if component unmounts before promo is claimed
    return unsubscribe;
  }, [listenOnce]);

  return <div>Special Offer Active</div>;
}
```

---

### 10. Multi-Tab Authentication Synchronization

Keep authentication state consistent across all open tabs — logging out in one tab immediately logs out every other tab:

```tsx
import { useState, useEffect } from 'react';
import {
  useBroadcastChannel,
  useBroadcastListener,
  type BroadcastEventMap,
} from '@enjoys/react-api/broadcast';

interface AuthEvents extends BroadcastEventMap {
  'auth:state': { status: 'logged_in' | 'logged_out'; token?: string };
}

// User Profile / Settings in Tab A
export function UserProfile() {
  const { emit } = useBroadcastChannel<AuthEvents, 'auth:state'>('auth:state');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    // Notify all other open tabs
    emit({ status: 'logged_out' });
  };

  return <button onClick={handleLogout}>Log Out Everywhere</button>;
}

// Any other component in Tab B, C, etc.
export function AppAuthGuard() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useBroadcastListener<AuthEvents, 'auth:state'>('auth:state', (event) => {
    if (event.status === 'logged_out') {
      setIsLoggedIn(false);
      window.location.href = '/login';
    }
  });

  if (!isLoggedIn) return <div>Session ended. Redirecting...</div>;
  return <div>Protected App Content</div>;
}
```

---

### 11. Multi-Tab Shopping Cart Sync

Synchronize cart items, counts, and totals across multiple tabs in real-time:

```tsx
import { useBroadcastChannel, useBroadcastListener, type BroadcastEventMap } from '@enjoys/react-api/broadcast';

interface CartEvents extends BroadcastEventMap {
  'cart:update': { itemCount: number; total: number };
}

// Product Card
export function ProductCard({ price }: { price: number }) {
  const { emit } = useBroadcastChannel<CartEvents, 'cart:update'>('cart:update');

  const addToCart = () => {
    const updated = updateCartStorage(price);
    // Broadcast updated cart to all other tabs
    emit(updated);
  };

  return <button onClick={addToCart}>Add to Cart</button>;
}

// Header Cart Badge in other tabs
export function CartHeaderBadge() {
  const [cartInfo, setCartInfo] = useState({ itemCount: 0, total: 0 });

  useBroadcastListener<CartEvents, 'cart:update'>('cart:update', (data) => {
    setCartInfo(data);
  });

  return (
    <div>
      <span>Cart ({cartInfo.itemCount})</span>
      <span>${cartInfo.total.toFixed(2)}</span>
    </div>
  );
}
```

---

### 12. SSR / Next.js Safe Usage

All hooks are guarded against server environments and gracefully no-op during SSR:

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  useBroadcastChannel,
  useBroadcastListener,
  isBroadcastChannelSupported,
} from '@enjoys/react-api/broadcast';

export function SSRSafeSyncComponent() {
  const { emit, isSupported } = useBroadcastChannel('my-channel');
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (!isSupported) {
      setStatus('BroadcastChannel is not supported in this browser.');
      return;
    }
    setStatus('Ready for cross-tab sync!');
  }, [isSupported]);

  useBroadcastListener('my-channel', (data) => {
    console.log('Received in client:', data);
  });

  return (
    <div>
      <p>Status: {status}</p>
      <button disabled={!isSupported} onClick={() => emit({ ping: Date.now() })}>
        Ping Tabs
      </button>
    </div>
  );
}
```
