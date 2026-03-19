export interface FileInfo {
    name: string;
    size: number;
    type: string;
    lastModified: number;
}

export interface ListEntry {
    name: string;
    kind: 'file' | 'directory';
}

export type WriteData = string | Blob | BufferSource;

export class OFSManager {
    private rootHandle: FileSystemDirectoryHandle | null = null;

    constructor() { }

    /**
     * Whether the OFS has been initialized with a directory handle.
     */
    get initialized(): boolean {
        return this.rootHandle !== null;
    }

    /**
     * Requests access to a directory by showing a directory picker dialog.
     * Must be called before performing any file operations.
     */
    async requestAccess(): Promise<void> {
        this.rootHandle = await window.showDirectoryPicker();
    }

    /**
     * Sets the root handle directly (e.g. from a DataTransferItem or stored handle).
     */
    setRootHandle(handle: FileSystemDirectoryHandle): void {
        this.rootHandle = handle;
    }

    // ─── Permission ──────────────────────────────────────────────────────

    /**
     * Checks whether the user has granted readwrite permission.
     */
    async isAllowed(): Promise<boolean> {
        if (!this.rootHandle) return false;
        const permission = await this.rootHandle.queryPermission({ mode: "readwrite" });
        return permission === "granted";
    }

    // ─── Existence ───────────────────────────────────────────────────────

    /**
     * Checks if a file exists at the given path.
     */
    async fileExists(path: string): Promise<boolean> {
        this.assertInitialized();
        try {
            await this.getFileHandle(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if a directory exists at the given path.
     */
    async directoryExists(path: string): Promise<boolean> {
        this.assertInitialized();
        try {
            await this.getDirectoryHandle(path);
            return true;
        } catch {
            return false;
        }
    }

    // ─── Read ────────────────────────────────────────────────────────────

    /**
     * Reads a file as a text string.
     */
    async readFile(path: string): Promise<string> {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        return await file.text();
    }

    /**
     * Reads a file as a Blob.
     */
    async readFileAsBlob(path: string): Promise<Blob> {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        return file;
    }

    /**
     * Reads a file as an ArrayBuffer.
     */
    async readFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
    }

    /**
     * Reads a file and parses it as JSON.
     */
    async readFileAsJSON<T = unknown>(path: string): Promise<T> {
        const text = await this.readFile(path);
        return JSON.parse(text);
    }

    // ─── Write ───────────────────────────────────────────────────────────

    /**
     * Writes content to a file, creating intermediate directories as needed.
     * Supports string, Blob, ArrayBuffer, and TypedArray.
     */
    async writeFile(path: string, contents: WriteData): Promise<void> {
        const fileHandle = await this.getFileHandle(path, true);
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();
    }

    /**
     * Appends content to an existing file. Creates the file if it doesn't exist.
     */
    async appendFile(path: string, contents: string | Blob): Promise<void> {
        const fileHandle = await this.getFileHandle(path, true);
        const file = await fileHandle.getFile();
        const existingContent = await file.text();
        const newContent = typeof contents === 'string'
            ? existingContent + contents
            : new Blob([existingContent, contents]);
        const writable = await fileHandle.createWritable();
        await writable.write(newContent);
        await writable.close();
    }

    /**
     * Writes a JSON-serializable value to a file.
     */
    async writeJSON(path: string, data: unknown, indent: number = 2): Promise<void> {
        const text = JSON.stringify(data, null, indent);
        await this.writeFile(path, text);
    }

    // ─── Delete ──────────────────────────────────────────────────────────

    /**
     * Deletes a file at the given path.
     */
    async deleteFile(path: string): Promise<void> {
        this.assertInitialized();
        const { dir, name } = await this.resolvePath(path);
        await dir.removeEntry(name);
    }

    /**
     * Deletes a directory at the given path, including all contents.
     */
    async deleteDirectory(path: string): Promise<void> {
        this.assertInitialized();
        const { dir, name } = await this.resolvePath(path);
        await dir.removeEntry(name, { recursive: true });
    }

    // ─── Directory ───────────────────────────────────────────────────────

    /**
     * Creates a directory at the given path (including intermediate directories).
     */
    async createDirectory(path: string): Promise<void> {
        await this.getDirectoryHandle(path, true);
    }

    /**
     * Lists all entries (files and subdirectories) in the given directory path.
     * Pass an empty string or "/" to list the root.
     */
    async listDirectory(path?: string): Promise<ListEntry[]> {
        this.assertInitialized();
        let dir: FileSystemDirectoryHandle;
        if (!path || path === '/' || path === '.') {
            dir = this.rootHandle!;
        } else {
            dir = await this.getDirectoryHandle(path);
        }
        const entries: ListEntry[] = [];
        for await (const [name, handle] of (dir as any).entries()) {
            entries.push({ name, kind: handle.kind });
        }
        return entries;
    }

    /**
     * Lists only file names in the given directory.
     */
    async listFiles(path?: string): Promise<string[]> {
        const entries = await this.listDirectory(path);
        return entries.filter(e => e.kind === 'file').map(e => e.name);
    }

    /**
     * Lists only subdirectory names in the given directory.
     */
    async listDirectories(path?: string): Promise<string[]> {
        const entries = await this.listDirectory(path);
        return entries.filter(e => e.kind === 'directory').map(e => e.name);
    }

    // ─── File Info ───────────────────────────────────────────────────────

    /**
     * Retrieves metadata (name, size, type, lastModified) for a file.
     */
    async getFileInfo(path: string): Promise<FileInfo> {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
        };
    }

    // ─── Copy / Move / Rename ────────────────────────────────────────────

    /**
     * Copies a file from one path to another.
     */
    async copyFile(srcPath: string, destPath: string): Promise<void> {
        const srcHandle = await this.getFileHandle(srcPath);
        const file = await srcHandle.getFile();
        await this.writeFile(destPath, file);
    }

    /**
     * Moves (or renames) a file from one path to another.
     */
    async moveFile(srcPath: string, destPath: string): Promise<void> {
        await this.copyFile(srcPath, destPath);
        await this.deleteFile(srcPath);
    }

    /**
     * Renames a file. Alias for `moveFile` within the same directory.
     */
    async renameFile(oldPath: string, newName: string): Promise<void> {
        const parts = oldPath.split('/');
        parts.pop();
        const newPath = [...parts, newName].join('/');
        await this.moveFile(oldPath, newPath);
    }

    // ─── Internal Helpers ────────────────────────────────────────────────

    private assertInitialized(): void {
        if (!this.rootHandle) throw new Error("OFS not initialized. Call requestAccess() first.");
    }

    /**
     * Resolves a nested path into the parent directory handle and the entry name.
     */
    private async resolvePath(path: string): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
        this.assertInitialized();
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop()!;
        if (!name) throw new Error(`Invalid path: "${path}"`);
        let dir = this.rootHandle!;
        for (const segment of parts) {
            try {
                dir = await dir.getDirectoryHandle(segment);
            } catch {
                throw new Error(`Directory not found: "${segment}" in path "${path}"`);
            }
        }
        return { dir, name };
    }

    private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
        this.assertInitialized();
        const parts = path.split('/').filter(Boolean);
        const fileName = parts.pop()!;
        if (!fileName) throw new Error(`Invalid file path: "${path}"`);
        let dir = this.rootHandle!;
        for (const segment of parts) {
            dir = await dir.getDirectoryHandle(segment, { create });
        }
        return await dir.getFileHandle(fileName, { create });
    }

    private async getDirectoryHandle(path: string, create = false): Promise<FileSystemDirectoryHandle> {
        this.assertInitialized();
        const parts = path.split('/').filter(Boolean);
        let dir = this.rootHandle!;
        for (const segment of parts) {
            dir = await dir.getDirectoryHandle(segment, { create });
        }
        return dir;
    }
}
