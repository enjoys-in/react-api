"use client";


import dot from "dot-object";
import Dexie, { Table } from "dexie";
import { Prettify } from "../types";
import {
    DotPathToNested,
    NestedKeys,
    PathValue,
    PrimaryKeyType,
    QueryOptions,
    TableSchema,
    TableValue,
    UpdatesForTable,
} from "./types/idb.interface";
import { QueryBuilder } from "./query-builder";

export class IDB<Tables extends { [key: string]: Table }> {
    private db: Dexie & Tables;
    /**
     * @param tables - The table schema definition for the database.
     * @param name - The name of the database (default: "idb").
     * @param version - The version of the database (default: 1).
     */
    constructor(
        private readonly tables: TableSchema<Tables>,
        name: string = "idb",
        version: number = 1
    ) {
        this.db = new Dexie(name) as Dexie & Tables;
        this.db.version(version).stores(tables);
        !this.db.isOpen() && this.db.open();
        if (typeof window !== "undefined") {
            import("dexie-observable").then(() => this.useObservable());
        }

    }
    /**
     * Activates the observable plugin for Dexie. This allows observing changes to the database.
     * 
     * @remarks
     * This function is automatically called when the module is loaded in a browser environment.
     * It is not necessary to call it manually.
     */
    private useObservable() {
        console.log("Observable activated");
    }
    /**
     * Returns the underlying Dexie database instance.
     *
     * @returns The raw Dexie database instance.
     */
    getRawDb(): Dexie & Tables {
        return this.db;
    }
    /**
     * Retrieves the primary key for a given table.
     *
     * @param tableName - The name of the table for which to retrieve the primary key.
     * @returns The primary key field name for the specified table.
     */
    private getPrimaryKeyForTable(tableName: keyof TableSchema<Table>): string {
        const schema = this.tables[tableName];
        const keys = schema.split(",").map((key) => key.trim());
        const validKeys = keys.filter((key) => !key.startsWith("++"));
        return validKeys[0];
    }
    /**
     * Checks if a given record exists in the database.
     *
     * @param table - The table to check in.
     * @param key - The primary key of the record to check.
     * @returns A promise that resolves to true if the record exists, false otherwise.
     */
    async has<T extends keyof Tables, Key extends PrimaryKeyType<Tables, T>>(
        table: T,
        key: Key
    ): Promise<boolean> {
        return (await this.db.table(table as string).get(key as any)) !== undefined;
    }
    /**
     * Opens a new IndexedDB database with specified object stores.
     *
     * @param dbName - The name of the database to open.
     * @param version - The version of the database. Defaults to 1.
     * @param objectStores - An array of object store names to create if they don't already exist.
     *
     * @returns A promise that resolves to the opened IDBDatabase instance.
     *
     * The function handles database upgrades by creating any specified object stores
     * that do not already exist, with "id" as the key path and auto-increment enabled.
     * It also handles errors by rejecting the promise with an error message.
     */
    async openNewDatabase(
        dbName: string,
        version: number = 1,
        objectStores: string[]
    ) {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbName, version);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBRequest).result;

                objectStores.forEach((storeName) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, {
                            keyPath: "id",
                            autoIncrement: true,
                        });
                    }
                });
            };

            request.onsuccess = () => {
                const db = request.result as IDBDatabase;
                resolve(db);
            };

            request.onerror = (event) => {
                reject(`Error opening database: ${event}`);
            };
        });
    }

    /**
      
       * Closes the connection to the IndexedDB database if it is currently open.
       *
       * @returns A boolean indicating whether the database was open and subsequently closed.
       */
    closeDbConnection() {
        return this.db.isOpen() && this.db.close();
    }
    /**
     * Deletes the IndexedDB database and then re-opens it.
     *
     * @returns A promise that resolves when the database has been deleted and re-opened.
     *
     * This method is useful for cleaning up any data that may have been left behind
     * after a user has closed the app. Note that this method will not delete the
     * database file, but rather just clear all the data from it.
     */
    async cleanDb() {
        return this.db.delete().then(() => this.db.open());
    }

    /**
     * Gets a Dexie Table instance for the specified table name.
     *
     * @param tableName - The name of the table to retrieve.
     * @returns A Dexie Table instance for the specified table.
     *
     * Note that this function is private and should not be called directly.
     */
    private getTable<K extends keyof Tables>(tableName: K) {
        return this.db.table(tableName as string);
    }

    /**
     * Adds a new item to the specified table.
     *
     * @param table - The name of the table to add the item to.
     * @param item - The item to add. The item must be a partial of the table's
     * entity type, with at least one field specified.
     *
     * @returns The key of the newly added item.
     *
     * Note that if the item is missing the primary key, Dexie will automatically
     * generate one.
     */
    async addItem<K extends keyof Tables>(
        table: K,
        item: Partial<TableValue<Tables[K]>>
    ) {
        return this.getTable(table).add(item);
    }

    /**
     * Adds multiple items to the specified table in a single transaction.
     *
     * @param table - The name of the table to add the items to.
     * @param items - An array of items to add. Each item must be a partial of the table's
     * entity type, with at least one field specified.
     *
     * @returns The number of items added.
     */
    async bulkAddItems<K extends keyof Tables>(
        table: K,
        items: TableValue<Tables[K]>[]
    ) {
        return this.getTable(table).bulkAdd(items);
    }

    /**
     * Adds or updates an item in the specified table.
     *
     * @param table - The name of the table to add or update the item in.
     * @param item - The item to add or update. The item must be a partial of the table's
     * entity type, with at least one field specified. If the item already exists in the
     * table, it will be updated with the specified values. Otherwise, it will be added.
     *
     * @returns The key of the added or updated item.
     */
    async putItem<K extends keyof Tables>(
        table: K,
        item: Partial<TableValue<Tables[K]>>
    ) {
        return this.getTable(table).put(item);
    }
    /**
     * Adds or updates multiple items in the specified table in a single transaction.
     *
     * @param table - The name of the table to add or update the items in.
     * @param items - An array of items to add or update. Each item must be a partial of the table's
     * entity type, with at least one field specified. If an item already exists in the
     * table, it will be updated with the specified values. Otherwise, it will be added.
     *
     * @returns The number of items added or updated.
     */
    async bulkPutItems<K extends keyof Tables>(table: K, item: Tables[K][]) {
        return this.getTable(table).bulkPut(item);
    }
    // 🟢 Read

    /**
     * Retrieves an item from the specified table by its primary key.
     *
     * @param table - The name of the table to retrieve the item from.
     * @param value - The value of the primary key of the item to retrieve.
     *
     * @returns The retrieved item, or undefined if no item was found.
     */
    async getItemByKey<K extends keyof Tables>(
        table: K,
        value: string
    ): Promise<TableValue<Tables[K]> | undefined> {
        return this.getTable(table).get(value);
    }

    /**
     * Retrieves all items from the specified table.
     *
     * @param table - The name of the table to retrieve the items from.
     * @param sorted - Whether to sort the returned items by their primary key.
     *
     * @returns An array of all items in the specified table, sorted by primary key if requested.
     */
    async getAllItems<K extends keyof Tables>(
        table: K,
        sorted: boolean = false
    ): Promise<Array<TableValue<Tables[K]>>> {
        return this.getTable(table).toArray();
    }
    /**
     * Retrieves items from the specified table by the value of a given field.
     *
     * @param table - The name of the table to retrieve the items from.
     * @param where - The field to query by.
     * @param equals - The value to query for.
     * @param limit - The maximum number of items to return. Defaults to 10.
     *
     * @returns An array of items from the specified table, sorted in reverse order by the given field, or undefined if no items were found.
     */
    async getItemsByIndex<K extends keyof Tables>(
        table: K,
        where: keyof TableValue<Tables[K]>,
        equals: string,
        limit: number = 10
    ): Promise<Array<TableValue<Tables[K]>> | undefined> {
        return this.getTable<K>(table)
            .where(where as unknown as string)
            .equals(equals)
            .reverse()
            .limit(limit)
            .toArray();
    }

    /**
     * Retrieves a chunk of items from the specified table.
     *
     * @param table - The name of the table to retrieve the items from.
     * @param offset - The offset of the first item in the chunk.
     * @param limit - The size of the chunk.
     *
     * @returns An array of items from the specified table, or undefined if no items were found.
     */
    async getItemsChunk<K extends keyof Tables>(
        table: K,
        offset: number,
        limit: number
    ) {
        return this.getTable(table).offset(offset).limit(limit).toArray();
    }
    /**
     * Runs a query on a specified table.
     *
     * @param table - The name of the table to query.
     * @param options - An object of options to customize the query.
     *
     * @returns The result of the query, which depends on the options provided.
     *
     * Available options:
     * - `where`: An object specifying a where clause for the query. The object should have the following properties:
     *   - `field`: The name of the field to query on.
     *   - `operator`: The operator to use. Supported operators are `equals`, `anyOf`, `above`, `below`, and `between`.
     *   - `value`: The value to query for. If `operator` is `between`, this should be a 2-element array.
     * - `sortBy`: The name of the field to sort the results by.
     * - `offset`: The offset of the first item to return.
     * - `limit`: The maximum number of items to return.
     * - `reverse`: Whether to return the results in reverse order.
     * - `count`: Whether to return the count of items that match the query instead of the items themselves.
     * - `each`: A callback to execute on each item in the query result.
     * - `primaryKeys`: Whether to return only the primary keys of the items in the query result.
     * - `raw`: Whether to return the raw Dexie collection object instead of the query result.
     */
    async query<K extends keyof Tables>(
        table: K,
        options: QueryOptions<Tables, K> = {}
    ): Promise<any> {
        const {
            where,
            sortBy,
            offset = 0,
            limit = Infinity,
            reverse = false,
            count = false,
            each,
            primaryKeys = false,
            raw = false,
        } = options;

        const tableRef = this.getTable<K>(table);
        let collection: Dexie.Collection<Tables[K], any>;

        // Apply where clause if present
        if (where) {
            const { field, operator = "equals", value } = where;
            const clause = tableRef.where(field as any);
            switch (operator) {
                case "equals":
                    collection = clause.equals(value);
                    break;
                case "anyOf":
                    collection = clause.anyOf(value);
                    break;
                case "above":
                    collection = clause.above(value);
                    break;
                case "below":
                    collection = clause.below(value);
                    break;
                case "between":
                    if (Array.isArray(value) && value.length === 2) {
                        collection = clause.between(value[0], value[1]);
                    } else {
                        throw new Error("Value for 'between' must be a 2-element array");
                    }
                    break;
                default:
                    throw new Error(`Unsupported operator: ${operator}`);
            }
        } else {
            collection = tableRef.toCollection();
        }

        // // Apply sorting
        // if (sortBy) {
        //   collection = collection.sortBy("sortBy");
        // }

        // collection.count()
        // collection.keys()
        // collection.uniqueKeys()
        // collection.first()
        // collection.filter()
        // collection.last()

        if (reverse) {
            collection = collection.reverse();
        }

        collection = collection.offset(offset).limit(limit);

        // Return raw Dexie collection (optional)
        if (raw) return collection;

        // Return count
        if (count) return await collection.count();

        // Execute `each` callback if provided
        if (each) {
            await collection.each(each);
            return;
        }

        // Return only primary keys
        if (primaryKeys) {
            return await collection.primaryKeys();
        }

        // Default return: array of objects
        return collection.toArray();
    }

    // 🟠 Update

    /**
     * Updates an item in a table.
     *
     * @param table - The name of the table to update the item in.
     * @param field_value - The value of the primary key of the item to update.
     * @param updated - The new values of the item to update.
     *
     * @returns The updated item.
     */
    async updateItem<K extends keyof Tables>(
        table: K,
        field_value: string,
        updated: TableValue<Tables[K]>
    ) {
        return this.getTable(table).update(field_value, updated);
    }

    // 🔴 Delete

    /**
     * Deletes an item from a table.
     *
     * @param table - The name of the table from which to delete the item.
     * @param field_value - The value of the primary key of the item to delete.
     *
     * @returns A promise that resolves once the item has been deleted.
     */
    async deleteItem<K extends keyof Tables>(table: K, field_value: any) {
        return this.getTable(table).delete(field_value);
    }

    /**
     * Deletes multiple items from the specified table.
     *
     * @param table - The name of the table from which to delete the items.
     * @param keys - An array of primary keys of the items to be deleted.
     *
     * @returns A promise that resolves once the items have been deleted.
     */
    async bulkDeleteItems<K extends keyof Tables>(table: K, keys: any[]) {
        return this.getTable(table).bulkDelete(keys);
    }

    /**
     * Prunes old items from the specified table, so that there are never more
     * than `maxLimit` items in the table.
     *
     * @param table - The name of the table from which to prune items.
     * @param keyField - The field to use as the primary key to determine the
     * oldest items.
     * @param maxLimit - The maximum number of items to allow in the table.
     * Defaults to 50.
     *
     * @returns A promise that resolves once the items have been pruned.
     */
    async pruneOldItems<K extends keyof Tables>(
        /**
         * Prunes old items from the specified table, so that there are never more
         * than `maxLimit` items in the table.
         *
         * @param table - The name of the table from which to prune items.
         * @param keyField - The field to use as the primary key to determine the
         * oldest items.
         * @param maxLimit - The maximum number of items to allow in the table.
         * Defaults to 50.
         *
         * @returns A promise that resolves once the items have been pruned.
         */
        table: K,
        keyField: keyof Tables[K],
        maxLimit = 50
    ) {
        const items = (await this.getAllItems<K>(table)) as any[];

        if (items.length > maxLimit) {
            const oldest = items.slice(0, items.length - maxLimit);
            await this.bulkDeleteItems(
                table,
                oldest.map((item) => item[keyField])
            );
        }
    }
    // 🟠 Nested Object Functions

    /**
     * Retrieves the value of a nested field from a given object, using a path string.
     *
     * @typeparam T The type of the object to retrieve the nested value from.
     * @typeparam P The path to the nested field, represented as a string of keys separated by dots.
     *
     * @param obj The object from which to retrieve the nested value.
     * @param path The path to the nested field within the object.
     *
     * @returns The value of the nested field if it exists, or undefined if the path does not exist in the object.
     */
    async getNestedValue<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(
        obj: T,
        path: P
    ): Promise<{
        success: boolean;
        path: P;
        value: PathValue<TableValue<Tables[T]>, P> | undefined;
    }> {
        const keys = path.split(".");

        const result = keys.reduce<any>((current, key) => {
            if (current == null) return { success: false, path, value: undefined };
            return current[key];
        }, obj) as PathValue<TableValue<Tables[T]>, P>;

        return {
            success: true,
            path,
            value: result as PathValue<TableValue<Tables[T]>, P>,
        };
    }

    // Get a nested field with strict types for path and primaryKey

    /**
     * Retrieves the value of a nested field from an item in the specified table,
     * using a path string.
     *
     * @typeparam T The type of the table to retrieve the item from.
     * @typeparam P The path to the nested field, represented as a string of keys
     * separated by dots.
     *
     * @param tableName The name of the table to retrieve the item from.
     * @param primaryKey The primary key of the item to retrieve the nested value from.
     * @param path The path to the nested field within the item.
     *
     * @returns The value of the nested field if it exists, or undefined if the path
     * does not exist in the item.
     */
    async getNestedItem<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKey: PrimaryKeyType<Tables, T>,
        path: P
    ): Promise<{
        success: boolean;
        path: P;
        value?: PathValue<TableValue<Tables[T]>, P> | undefined;
    }> {
        try {
            const table = this.getTable(tableName) as Table<any, any>;
            const record = await table.get(primaryKey);
            if (!record) return { success: false, path, value: undefined };

            const keys = (path as string).split(".");
            let obj = record;

            for (const key of keys) {
                if (obj == null || !(key in obj))
                    return { success: false, path, value: undefined };
                obj = obj[key];
            }

            return {
                success: true,
                path,
                value: obj as PathValue<TableValue<Tables[T]>, P>,
            };
        } catch (error) {
            return { success: false, path, value: undefined };
        }
    }
    async getMultiNestedItem<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKey: string | number,
        paths: P[]
    ): Promise<{
        paths: P[];
        value:
        | DotPathToNested<{ [key in P]: PathValue<TableValue<Tables[T]>, P> }>
        | undefined;
        success: boolean;
    }> {
        const table = this.getTable(tableName) as Table<any, any>;
        const record = await table.get(primaryKey);
        if (!record) return { success: false, paths, value: undefined as any };

        const obj: any = {};

        for (const path of paths) {
            const keys = path.split(".");
            let current: any = record;
            let isValid = true;

            for (const key of keys) {
                if (current == null || typeof current !== "object") {
                    isValid = false;
                    break;
                }
                current = current[key];
            }

            if (isValid) {
                let target = obj;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    if (!target[key]) target[key] = {};
                    target = target[key];
                }
                target[keys[keys.length - 1]] = current;
            }
        }

        return {
            paths,
            value: dot.object(obj) as DotPathToNested<{
                [key in P]: PathValue<TableValue<Tables[T]>, P>;
            }>,
            success: true,
        };
    }

    /**
     * Adds nested items to a specified table, updating existing records or creating a new one if necessary.
     *
     * @typeparam T - The type of the table to which the items will be added.
     *
     * @param tableName - The name of the table where the nested items will be added.
     * @param primaryKeyValue - The primary key of the item to update. If the item doesn't exist, a new one will be created.
     * @param updates - An object containing paths to the nested fields and their new values.
     *
     * @returns A promise that resolves to an object containing:
     * - `success`: A boolean indicating whether the operation was successful.
     * - `created`: A boolean indicating whether a new record was created.
     * - `updatedPaths`: An array of strings representing the paths that were updated.
     */

    async addNestedItem<
        T extends keyof Tables,
        Updates extends UpdatesForTable<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKeyValue: PrimaryKeyType<Tables, T>, // Primary key is dynamically typed based on the selected table
        updates: Updates // Path is dynamically typed based on the table's entity structure
    ): Promise<{
        success: boolean;
        created: boolean;
        updatedPaths: (keyof Updates)[];
        updates: Updates;
        oldValues: Partial<Updates>;
    }> {
        const table = this.getTable(tableName) as Table<any, any>;

        // Try to get existing record
        let record = await table.get(primaryKeyValue);
        const created = !record;

        if (!record) {
            const primaryKey = this.getPrimaryKeyForTable(tableName as any);
            record = { [primaryKey]: primaryKeyValue } as TableValue<Tables[T]>;
        }

        const updatedPaths: (keyof Updates)[] = [];
        const oldValues: Partial<Updates> = {};

        for (const [path, value] of Object.entries(updates) as [
            keyof Updates,
            any
        ][]) {
            const keys = (path as string).split(".");
            let obj = record;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (typeof obj[key] !== "object" || obj[key] === null) {
                    obj[key] = {};
                }
                obj = obj[key];
            }

            const finalKey = keys[keys.length - 1];
            oldValues[path] = obj[finalKey];
            obj[finalKey] = value;
        }

        await table.put({ ...record, updatedAt: Date.now?.() });

        return { success: true, created, updatedPaths, updates, oldValues };
    }

    /**
     * Updates the value of a nested field in an item in the specified table.
     *
     * @typeparam T The type of the table to update the item in.
     * @typeparam P The path to the nested field, represented as a string of keys
     * separated by dots.
     *
     * @param tableName The name of the table to update the item in.
     * @param primaryKey The primary key of the item to update.
     * @param path The path to the nested field within the item.
     * @param value The new value of the nested field.
     *
     * @returns A promise that resolves to an object containing:
     * - `success`: A boolean indicating whether the operation was successful.
     * - `path`: The path that was updated.
     * - `oldValue`: The value of the nested field before the update, or undefined if
     * the path does not exist in the item.
     * - `newValue`: The value of the nested field after the update, or undefined if
     * the path does not exist in the item.
     */
    async updateNestedItem<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKey: PrimaryKeyType<Tables, T>,
        path: P,
        value: PathValue<TableValue<Tables[T]>, P>
    ): Promise<{
        success: boolean;
        path: P;
        oldValue?: PathValue<TableValue<Tables[T]>, P>;
        newValue?: PathValue<TableValue<Tables[T]>, P>;
    }> {
        const table = this.getTable(tableName) as Table<any, any>;
        const record = await table.get(primaryKey);
        if (!record) return { success: false, path };

        const keys = (path as string).split(".");
        let obj: any = record;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (typeof obj[key] !== "object" || obj[key] === null) {
                obj[key] = {}; // create intermediate object if missing
            }
            obj = obj[key];
        }

        const finalKey = keys[keys.length - 1];
        const oldValue = obj[finalKey];
        obj[finalKey] = value;

        await table.put({ ...record, updatedAt: Date.now?.() });

        return { success: true, path, oldValue, newValue: value };
    }

    /**
     * Updates multiple nested fields in an item in the specified table.
     *
     * @typeparam T The type of the table to update the item in.
     *
     * @param tableName The name of the table to update the item in.
     * @param primaryKey The primary key of the item to update.
     * @param updates An object where each key is a nested field path and each value is the new value of that field.
     *
     * @returns A promise that resolves to an object containing:
     * - `success`: A boolean indicating whether the operation was successful.
     * - `updated`: An array of paths that were updated.
     */
    async updateMultipleNestedItems<
        T extends keyof Tables,
        Updates extends UpdatesForTable<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKey: PrimaryKeyType<Tables, T>,
        updates: Updates
    ): Promise<
        Prettify<
            | { success: false; updated: (keyof Updates)[]; updates: null }
            | {
                success: true;
                updated: (keyof Updates)[];
                updates: DotPathToNested<Updates>;
            }
        >
    > {
        const table = this.getTable(tableName) as Table<any, any>;
        const record = await table.get(primaryKey);
        if (!record) return { success: false, updated: [], updates: null };

        const updatedPaths: (keyof Updates)[] = [];

        for (const [path, value] of Object.entries(updates) as [
            keyof Updates,
            any
        ][]) {
            const keys = (path as string).split(".");
            let obj = record;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (typeof obj[key] !== "object" || obj[key] === null) {
                    obj[key] = {};
                }
                obj = obj[key];
            }

            const finalKey = keys[keys.length - 1];
            obj[finalKey] = value;
            updatedPaths.push(path);
        }

        await table.put({ ...record, updatedAt: Date.now?.() });

        return {
            success: true,
            updated: updatedPaths,
            updates: dot.object(updates) as DotPathToNested<{
                [key in keyof Updates]: Updates[key];
            }>,
        };
    }
    /**
     * Deletes a nested field in an item in the specified table.
     *
     * @typeparam T The type of the table to delete the nested field from.
     * @typeparam P The path to the nested field, represented as a string of keys separated by dots.
     *
     * @param tableName The name of the table to delete the nested field from.
     * @param primaryKey The primary key of the item to delete the nested field from.
     * @param path The path to the nested field to delete.
     *
     * @returns A promise that resolves to an object containing:
     * - `success`: A boolean indicating whether the operation was successful.
     * - `path`: The path of the nested field that was attempted to be deleted.
     * - `deletedValue`: The value of the nested field that was deleted, if the operation was successful.
     */
    async deleteNestedItem<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(
        tableName: T,
        primaryKey: PrimaryKeyType<Tables, T>,
        path: P
    ): Promise<{
        success: boolean;
        path: P;
        deletedValue?: PathValue<TableValue<Tables[T]>, P>;
    }> {
        const table = this.getTable(tableName) as Table<any, any>;
        const record = await table.get(primaryKey);
        if (!record) return { success: false, path };

        const keys = (path as string).split(".");
        let obj: any = record;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in obj) || typeof obj[key] !== "object" || obj[key] === null) {
                return { success: false, path }; // invalid path
            }
            obj = obj[key];
        }

        const finalKey = keys[keys.length - 1];
        const deletedValue = obj[finalKey];

        if (finalKey in obj) {
            delete obj[finalKey];
            await table.put({ ...record, updatedAt: Date.now?.() });
            return { success: true, path, deletedValue };
        }

        return { success: false, path }; // nothing deleted
    }

    /**
     * Retrieves the type of a nested field in a table.
     *
     * @example type Schema = ReturnType<typeof createTypeSchema<T, K>>
     * @typeparam T The table to retrieve from.
     * @typeparam P The path to the nested field.
     *
     * @param table The table to retrieve from.
     * @param path The path to the nested field.
     *
     * @returns The type of the nested field.
     */
    createTypeSchema<
        T extends keyof Tables,
        P extends NestedKeys<TableValue<Tables[T]>>
    >(table: T, path: P): PathValue<TableValue<Tables[T]>, P> {
        return undefined as any;
    }
    rawQuery<T extends keyof Tables>(table: T) {
        return new QueryBuilder<Tables, T>(this.db, table);
    }
}