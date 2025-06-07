// src/OFSManager.ts
export class OFSManager {
    private rootHandle: FileSystemDirectoryHandle | null = null;
  
    constructor() {}
  
    async requestAccess(): Promise<void> {
      this.rootHandle = await window.showDirectoryPicker();
    }
  
    async fileExists(path: string): Promise<boolean> {
      if (!this.rootHandle) throw new Error("OFS not initialized");
      try {
        await this.rootHandle.getFileHandle(path, { create: false });
        return true;
      } catch {
        return false;
      }
    }
  
    async isAllowed(): Promise<boolean> {
      if (!this.rootHandle) return false;
      const permission = await this.rootHandle.queryPermission({ mode: "readwrite" });
      return permission === "granted";
    }
  
    async readFile(path: string): Promise<string> {
      const fileHandle = await this.getFileHandle(path);
      const file = await fileHandle.getFile();
      return await file.text();
    }
  
    async writeFile(path: string, contents: string | Blob): Promise<void> {
      const fileHandle = await this.getFileHandle(path, true);
      const writable = await fileHandle.createWritable();
      await writable.write(contents);
      await writable.close();
    }
  
    async deleteFile(path: string): Promise<void> {
      await this.rootHandle?.removeEntry(path);
    }
  
    private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
      if (!this.rootHandle) throw new Error("OFS not initialized");
      return await this.rootHandle.getFileHandle(path, { create });
    }
  }
  