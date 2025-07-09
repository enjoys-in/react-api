export class OFSManager {
  private rootHandle: FileSystemDirectoryHandle | null = null;

  constructor() { }

  /**
   * Requests access to a directory by showing a directory picker dialog.
   * Upon successful selection, the root handle is set to the chosen directory.
   * This must be called before performing any file operations.
   * 
   * @returns A promise that resolves once the access request is complete.
   * @throws An error if the directory picker fails to provide a directory handle.
   */
  async requestAccess(): Promise<void> {
    this.rootHandle = await window.showDirectoryPicker();
  }

  /**
   * Checks whether a file exists at the specified path.
   * 
   * @param path - The path of the file to check for existence.
   * @returns A promise that resolves to true if the file exists, false otherwise.
   * @throws An error if the OFS is not initialized.
   */

  /**
   * Checks if a file exists at the given path within the directory.
   *
   * @param path - The path of the file to check for existence.
   * @returns A promise that resolves to true if the file exists, or false if it does not.
   * @throws An error if the OFS is not initialized.
   */
  async fileExists(path: string): Promise<boolean> {
    if (!this.rootHandle) throw new Error("OFS not initialized");
    try {
      await this.rootHandle.getFileHandle(path, { create: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the user has granted readwrite permission to the
   * selected directory. If the OFS is not initialized, this method
   * returns false.
   *
   * @returns A promise that resolves to true if the user has granted
   * readwrite permission, or false otherwise.
   */
  async isAllowed(): Promise<boolean> {
    if (!this.rootHandle) return false;
    const permission = await this.rootHandle.queryPermission({ mode: "readwrite" });
    return permission === "granted";
  }

  /**
   * Reads the contents of a file at the given path.
   *
   * @param path - The path of the file to read.
   * @returns A promise that resolves to the contents of the file as a string.
   * @throws An error if the OFS is not initialized, or if the file does not exist.
   */
  async readFile(path: string): Promise<string> {
    const fileHandle = await this.getFileHandle(path);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * Writes the given contents to the file at the specified path.
   * If the file does not exist, it is created. If the file already
   * exists, its contents are overwritten.
   *
   * @param path The path to the file to write to, relative to the
   * user-selected directory.
   * @param contents The contents to write to the file. This can be a
   * string, a Blob, or a Buffer.
   * @returns A promise that resolves once the write is complete.
   * @throws An error if the OFS is not initialized.
   */
  async writeFile(path: string, contents: string | Blob): Promise<void> {
    const fileHandle = await this.getFileHandle(path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  /**
   * Deletes a file at the given path within the user-selected directory.
   *
   * @param path The path to the file to delete, relative to the user-selected
   * directory.
   * @returns A promise that resolves once the file is deleted.
   * @throws An error if the OFS is not initialized.
   */
  async deleteFile(path: string): Promise<void> {
    await this.rootHandle?.removeEntry(path);
  }

  /**
   * Retrieves a file handle for the specified path within the
   * user-selected directory. If the file does not exist, and
   * the `create` option is true, then the file is created.
   *
   * @private
   *
   * @param path The path to the file relative to the user-selected
   * directory.
   * @param create Whether to create the file if it does not exist.
   * @returns A promise that resolves to the file handle.
   */
  private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    if (!this.rootHandle) throw new Error("OFS not initialized");
    return await this.rootHandle.getFileHandle(path, { create });
  }
}
