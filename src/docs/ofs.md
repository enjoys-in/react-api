# OFS — Origin File System

A React hook and manager class for the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) — read, write, delete, copy, move, and list files from a user-selected directory.

## Features

- **Full CRUD** — read, write, append, delete files
- **Directory operations** — create, delete, list directories
- **Multiple read formats** — text, Blob, ArrayBuffer, JSON
- **Write anything** — string, Blob, ArrayBuffer, TypedArray
- **File info** — name, size, type, lastModified
- **Copy / Move / Rename** — file manipulation operations
- **Nested paths** — `folder/subfolder/file.txt` supported everywhere
- **Streaming** — `readFileAsStream()` for large files without loading into memory
- **Directory size** — `getDirectorySize()` calculates total bytes recursively
- **SSR-safe** — throws a clear error if called outside a browser environment
- **Safe writes** — writable streams are always closed, even on error
- **Strongly typed** — exported `UseOFSReturn` interface for typed props and context
- **React hook** — `useOFS()` with `ready` and `error` state
- **Permission check** — `isAllowed()` and `checkPermission()`

---

## Installation

```tsx
import { useOFS, OFSManager } from '@enjoys/react-api/ofs';
```

---

## Quick Start with React Hook

```tsx
import { useOFS } from '@enjoys/react-api/ofs';

function FileManager() {
  const { ofs, ready, error, requestAccess } = useOFS();

  const handleOpen = async () => {
    await requestAccess(); // Shows directory picker
  };

  const handleSave = async () => {
    await ofs.writeFile('notes/hello.txt', 'Hello, World!');
  };

  const handleRead = async () => {
    const text = await ofs.readFile('notes/hello.txt');
    console.log(text);
  };

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      {!ready ? (
        <button onClick={handleOpen}>Open Folder</button>
      ) : (
        <>
          <button onClick={handleSave}>Save File</button>
          <button onClick={handleRead}>Read File</button>
        </>
      )}
    </div>
  );
}
```

---

## API Reference

### `useOFS(): UseOFSReturn`

React hook that creates an `OFSManager` instance and tracks readiness.
Returns the strongly-typed `UseOFSReturn` interface.

| Return | Type | Description |
|---|---|---|
| `ofs` | `OFSManager` | The file system manager instance |
| `ready` | `boolean` | Whether access has been granted |
| `error` | `Error \| null` | Error from the last `requestAccess` call (e.g., user cancelled) |
| `requestAccess` | `() => Promise<void>` | Opens directory picker; sets `ready` on success, `error` on failure |
| `checkPermission` | `() => Promise<boolean>` | Checks if readwrite permission is still granted |

### `OFSManager`

Standalone class (no React required). Can also be used in workers, scripts, etc.

```tsx
const ofs = new OFSManager();
await ofs.requestAccess();
```

---

## Read Operations

```tsx
// Text
const text = await ofs.readFile('readme.txt');

// Blob
const blob = await ofs.readFileAsBlob('image.png');

// ArrayBuffer
const buffer = await ofs.readFileAsArrayBuffer('data.bin');

// JSON (auto-parsed)
const config = await ofs.readFileAsJSON<{ port: number }>('config.json');

// ReadableStream (for large files — avoids loading into memory)
const stream = await ofs.readFileAsStream('large-video.mp4');
```

---

## Write Operations

```tsx
// String
await ofs.writeFile('notes.txt', 'Hello World');

// Blob
await ofs.writeFile('photo.jpg', someBlob);

// ArrayBuffer / TypedArray
await ofs.writeFile('data.bin', myArrayBuffer);

// JSON (auto-serialized with indentation)
await ofs.writeJSON('config.json', { port: 3000, debug: true });
await ofs.writeJSON('minified.json', data, 0); // no indent

// Append to file
await ofs.appendFile('log.txt', '\n[2026-03-19] New entry');
```

---

## Delete Operations

```tsx
// Delete a file
await ofs.deleteFile('old-notes.txt');

// Delete a directory and all its contents
await ofs.deleteDirectory('temp');
```

---

## Directory Operations

```tsx
// Create a directory (including nested)
await ofs.createDirectory('projects/my-app/src');

// List everything in a directory
const entries = await ofs.listDirectory('projects');
// [{ name: 'my-app', kind: 'directory' }, { name: 'readme.md', kind: 'file' }]

// List root directory
const root = await ofs.listDirectory();

// List only files
const files = await ofs.listFiles('src');
// ['index.ts', 'App.tsx']

// List only subdirectories
const dirs = await ofs.listDirectories('src');
// ['components', 'hooks']
```

---

## File Info

```tsx
const info = await ofs.getFileInfo('photo.jpg');
// {
//   name: 'photo.jpg',
//   size: 245760,
//   type: 'image/jpeg',
//   lastModified: 1710806400000
// }
```

---

## Copy, Move & Rename

```tsx
// Copy a file
await ofs.copyFile('templates/base.html', 'output/index.html');

// Move a file (copy + delete source)
await ofs.moveFile('drafts/post.md', 'published/post.md');

// Rename a file (within the same directory)
await ofs.renameFile('src/old-name.ts', 'new-name.ts');
```

---

## Existence Checks

```tsx
const hasFile = await ofs.fileExists('config.json');
const hasDir = await ofs.directoryExists('src/components');
```

---

## Directory Size

```tsx
// Total bytes of all files in a directory (recursive)
const size = await ofs.getDirectorySize('assets');
console.log(`Assets folder: ${(size / 1024 / 1024).toFixed(2)} MB`);

// Root directory size
const totalSize = await ofs.getDirectorySize();
```

---

## Permissions

```tsx
// Check if readwrite permission is still granted
const allowed = await ofs.isAllowed();

// From the hook — updates `ready` state
const stillAllowed = await checkPermission();
```

---

## Advanced: Set Root Handle Directly

If you receive a `FileSystemDirectoryHandle` from drag-and-drop or the `DataTransferItem` API:

```tsx
const ofs = new OFSManager();

// From a drop event
const item = event.dataTransfer.items[0];
const handle = await item.getAsFileSystemHandle();
if (handle.kind === 'directory') {
  ofs.setRootHandle(handle as FileSystemDirectoryHandle);
}
```

---

## Advanced: Standalone Usage (No React)

```tsx
import { OFSManager } from '@enjoys/react-api/ofs';

const ofs = new OFSManager();
await ofs.requestAccess();

await ofs.writeFile('data/users.json', JSON.stringify([{ id: 1, name: 'Alice' }]));
const users = await ofs.readFileAsJSON('data/users.json');
console.log(users);
```

---

## Exported Types

```tsx
import type { FileInfo, ListEntry, WriteData, UseOFSReturn } from '@enjoys/react-api/ofs';
```

| Type | Description |
|---|---|
| `FileInfo` | `{ name: string; size: number; type: string; lastModified: number }` |
| `ListEntry` | `{ name: string; kind: 'file' \| 'directory' }` |
| `WriteData` | `string \| Blob \| BufferSource` |
| `UseOFSReturn` | Return type of `useOFS()` — `{ ofs, ready, error, requestAccess, checkPermission }` |

### Using `UseOFSReturn` for Typed Props

```tsx
import { useOFS } from '@enjoys/react-api/ofs';
import type { UseOFSReturn } from '@enjoys/react-api/ofs';

// Pass the typed hook return as a prop
function FileExplorer({ fs }: { fs: UseOFSReturn }) {
  if (!fs.ready) return <button onClick={fs.requestAccess}>Grant Access</button>;

  return (
    <div>
      <button onClick={() => fs.ofs.listFiles().then(console.log)}>List Files</button>
      {fs.error && <p>{fs.error.message}</p>}
    </div>
  );
}

// Parent component
function App() {
  const fs = useOFS();
  return <FileExplorer fs={fs} />;
}
```

---

## Browser Support

The File System Access API requires a secure context (HTTPS or localhost) and is supported in Chromium-based browsers (Chrome, Edge, Opera). Firefox and Safari have limited or no support — check [caniuse.com](https://caniuse.com/native-filesystem-api).
