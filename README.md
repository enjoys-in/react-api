# @enjoys/react-api

[![npm version](https://img.shields.io/npm/v/@enjoys/react-api)](https://www.npmjs.com/package/@enjoys/react-api)
[![license](https://img.shields.io/npm/l/@enjoys/react-api)](./LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

A collection of type-safe React hooks and utilities for browser-native APIs — IndexedDB, Cache Storage, File System Access, and Custom Events.

---

## Features

| Module | Description | Import |
|---|---|---|
| **IDB** | IndexedDB via Dexie — typed CRUD, QueryBuilder, operators, nested objects, TTL pruning | `@enjoys/react-api/idb` |
| **Cache Storage** | Browser Cache API — JSON, Blob, File, HTML, ArrayBuffer with TTL & metadata | `@enjoys/react-api/cache-storage` |
| **Events** | Cross-component CustomEvent hook — emit, listen, debounce, fire-once | `@enjoys/react-api/events` |
| **OFS** | File System Access API — read/write/delete files with nested directory support | `@enjoys/react-api/ofs` |

---

## Installation

```bash
npm install @enjoys/react-api
```

### Peer Dependencies

| Package | Required | Used by |
|---|---|---|
| `react` ^18 \|\| ^19 | Yes | All modules |
| `react-dom` ^18 \|\| ^19 | Yes | All modules |
| `dexie` ^4 | Optional | IDB module |
| `dot-object` ^2 | Optional | IDB nested operations |

```bash
# Install peer deps for IDB module
npm install dexie dot-object
```

---

## Quick Start

### IndexedDB

```tsx
import { IDB, CreatePKTableSchema, createQueryBuilder, equals } from '@enjoys/react-api/idb';
import { type EntityTable } from 'dexie';

type Tables = {
  users: EntityTable<{ id: string; name: string; age: number }, 'id'>;
};

const schema: CreatePKTableSchema<Tables> = { users: 'id' };
const idb = new IDB(schema, 'my-app');

// CRUD
await idb.addItem('users', { id: '1', name: 'Alice', age: 30 });
const user = await idb.getItemByKey('users', '1');

// QueryBuilder
const qb = createQueryBuilder(idb.getRawDb());
const adults = await qb.query('users').where({ age: above(18) }).findMany();
```

### Cache Storage

```tsx
import { useCache } from '@enjoys/react-api/cache-storage';

function App() {
  const cache = useCache('my-app');

  const load = async () => {
    await cache.put('user', { name: 'Alice' }, 3600);
    const user = await cache.get('user');
    const fresh = await cache.getOrSet('profile', () => fetch('/api/me').then(r => r.json()), 600);
  };

  return <button onClick={load}>Load</button>;
}
```

### Events

```tsx
import { useReactEvent } from '@enjoys/react-api/events';

function Sender() {
  const { emit } = useReactEvent('notify');
  return <button onClick={() => emit({ msg: 'hello' })}>Send</button>;
}

function Receiver() {
  const { listen } = useReactEvent('notify');
  useEffect(() => listen((data) => console.log(data)), [listen]);
  return null;
}
```

---

## Documentation

| Module | Guide |
|---|---|
| IndexedDB | [IDB Documentation](./src/docs/idb.md) |
| Cache Storage | [Cache Storage Documentation](./src/docs/cache-storage.md) |
| Events | [Events Documentation](./src/docs/events.md) |

---

## Tree-Shakable Imports

Each module is a separate entry point — only the code you import gets bundled:

```tsx
import { IDB } from '@enjoys/react-api/idb';           // Only IDB
import { useCache } from '@enjoys/react-api/cache-storage'; // Only Cache
import { useReactEvent } from '@enjoys/react-api/events';   // Only Events
import { useOFS } from '@enjoys/react-api/ofs';             // Only OFS
```

Supports both ESM (`import`) and CJS (`require`).

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

[MIT](./LICENSE.md) — made with care by [ENJOYS](https://github.com/enjoys-in)
