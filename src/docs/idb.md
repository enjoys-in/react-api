# IDB — IndexedDB with Dexie

A fully typed IndexedDB wrapper built on [Dexie.js](https://dexie.org/), with a fluent QueryBuilder, operators, nested object support, and optional change observation via `dexie-observable`.

## Features

- **Typed schema** – `TableSchema<Tables>` auto-suggests primary keys, `++` prefix, and indexed fields
- **CRUD** – `addItem`, `putItem`, `getItemByKey`, `updateItem`, `deleteItem`, bulk variants
- **Nested object operations** – read/write deeply nested fields using dot-notation paths
- **Fluent QueryBuilder** – chainable `where`, `or`, `orderBy`, `limit`, `offset`, `select`, `join`
- **Operator functions** – `equals`, `notEqual`, `startsWith`, `anyOf`, `above`, `below`, `between`, `$gte`, `$lte`
- **Query with options** – `query()` supports `where`, `sorted`, `limit`, `offset`, `sortBy`
- **Pagination** – `getItemsChunk()` for paginated reads
- **TTL pruning** – `pruneOldItems()` removes stale records by timestamp field
- **Observable** – auto-loads `dexie-observable` in browser environments

---

## Setup

### 1. Define Your Schema

```tsx
import { type EntityTable } from 'dexie';
import { IDB, type TableSchema } from '@enjoys/react-api/idb';

// Step 1: Define your entity interfaces
interface Mail {
  message_id: string;
  subject: string;
  body: string;
}

interface User {
  user_id: string;
  name: string;
  settings: { theme: string; notifications: boolean };
}

// Step 2: Define Tables — EntityTable<Entity, PK> selects the primary key
//         The second generic is the PK field name — must be a key of the entity
type Tables = {
  mails: EntityTable<Mail, 'message_id'>;  // PK = message_id
  users: EntityTable<User, 'user_id'>;     // PK = user_id
};

// Step 3: Define schema — TypeScript enforces PK first, suggests remaining fields as indexes
//         '++' prefix = auto-increment primary key
//         Without '++' = manually supplied primary key
const schema = {
  mails: '++message_id,subject',  // auto-increment PK + 'subject' indexed
  users: 'user_id,name',          // manual PK + 'name' indexed
} satisfies TableSchema<Tables>;

const idb = new IDB<Tables>(schema, 'my-database', 1);
```

---

## CRUD Operations

```tsx
// Add a single item
await idb.addItem('users', { user_id: '1', name: 'Alice', settings: { theme: 'dark', notifications: true } });

// Add multiple items
await idb.bulkAddItems('users', [
  { user_id: '2', name: 'Bob', settings: { theme: 'light', notifications: false } },
  { user_id: '3', name: 'Carol', settings: { theme: 'dark', notifications: true } },
]);

// Put (upsert)
await idb.putItem('users', { user_id: '1', name: 'Alice Updated', settings: { theme: 'light', notifications: true } });

// Get by primary key
const user = await idb.getItemByKey('users', '1');

// Get all items (optionally sorted by a field)
const allUsers = await idb.getAllItems('users', 'name');

// Check existence
const exists = await idb.has('users', '1');

// Update
await idb.updateItem('users', '1', { name: 'Alice V2' });

// Delete
await idb.deleteItem('users', '1');

// Bulk delete
await idb.bulkDeleteItems('users', ['2', '3']);
```

---

## Query with Options

The `query()` method supports inline filtering, sorting, pagination, and field selection:

```tsx
const results = await idb.query('users', {
  where: { name: 'Alice' },
  sortBy: 'name',
  sorted: 'asc',  // 'asc' | 'desc'
  limit: 10,
  offset: 0,
});
```

---

## QueryBuilder (Fluent API)

For advanced queries, use `createQueryBuilder`:

```tsx
import { createQueryBuilder, equals, above, $gte, startsWith, anyOf } from '@enjoys/react-api/idb';

const qb = createQueryBuilder(idb.getRawDb());

// Simple where
const admins = await qb
  .query('users')
  .where({ role: equals('admin') })
  .findMany();

// Chained conditions
const results = await qb
  .query('users')
  .where({ age: above(18) })
  .andWhere({ status: equals('active') })
  .orderBy('name')
  .limit(20)
  .offset(0)
  .findMany();

// OR conditions
const mixed = await qb
  .query('users')
  .or([
    { role: equals('admin') },
    { role: equals('moderator') },
  ])
  .findMany();

// Select specific fields
const names = await qb
  .query('users')
  .select(['name', 'user_id'])
  .findMany();

// Find one
const first = await qb.query('users').where({ name: equals('Alice') }).findOne();

// Find by ID
const user = await qb.query('users').findById('user-123');

// Count
const total = await qb.query('users').where({ role: equals('admin') }).count();

// Find and count
const { data, count } = await qb.query('users').findAndCount();

// Update / Delete
await qb.query('users').update('user-123', { name: 'Updated' });
await qb.query('users').delete('user-123');
await qb.query('users').deleteMany(['id-1', 'id-2']);
```

---

## Operators

All operators are exported from `@enjoys/react-api/idb`:

| Operator | Description | Example |
|---|---|---|
| `equals(value)` | Strict equality | `equals('admin')` |
| `notEqual(value)` | Not equal | `notEqual('banned')` |
| `startsWith(value)` | String starts with | `startsWith('Al')` |
| `anyOf(values)` | Value in array | `anyOf(['admin', 'mod'])` |
| `above(value)` / `$gt` | Greater than | `above(18)` |
| `below(value)` / `$lt` | Less than | `below(100)` |
| `$gte(value)` | Greater than or equal | `$gte(18)` |
| `$lte(value)` | Less than or equal | `$lte(65)` |
| `between([a, b])` | Between inclusive | `between([10, 50])` |

---

## Joins

```tsx
const usersWithMails = await qb
  .query('users')
  .join({
    store: 'mails',
    localKey: 'user_id',
    foreignKey: 'user_id',
    as: 'emails',
  })
  .findMany();
```

---

## Nested Object Operations

Access deeply nested fields using dot-notation paths:

```tsx
// Read a nested value
const theme = await idb.getNestedValue('users', 'user-1', 'settings.theme');

// Write/add a nested value
await idb.addNestedItem('users', 'user-1', 'settings.notifications', false);
```

---

## Pagination

```tsx
const page = await idb.getItemsChunk('users', 0, 20); // offset, limit
```

---

## TTL Pruning

Remove records older than a given threshold:

```tsx
// Remove users where `createdAt` is older than 30 days
await idb.pruneOldItems('users', 'createdAt', 30 * 24 * 60 * 60 * 1000);
```

---

## Hooks & Observability

### Using `useRegisterDexieHook`

```tsx
import { useRegisterDexieHook } from '@enjoys/react-api/idb';

function App() {
  useRegisterDexieHook(idb.getRawDb(), (changes) => {
    console.log('DB changes:', changes);
  });
  return <div>...</div>;
}
```

### Framework-Specific Context

- [React Context example](../idb/examples/idbContext-react.md)
- [Next.js Context example](../idb/examples/idbContext-next.md)
- [Hook API example](../idb/examples/hook-api.md)

---

## Utility

```tsx
// Get the raw Dexie instance
const dexie = idb.getRawDb();

// Open a new database dynamically
await idb.openNewDatabase(newSchema, 'other-db', 2);

// Wipe the entire database
await idb.cleanDb();
```