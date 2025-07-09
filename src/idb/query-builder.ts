import Dexie from 'dexie';
import { Operator } from './operator';
import { SmartWhere, JoinConfig, DotPaths, SelectableFields } from './types/orm.interface';


type Row<Tables, TName extends keyof Tables> =
    Tables[TName] extends Dexie.Table<infer R, any> ? R : never;

type Key<Tables, TName extends keyof Tables> =
    Tables[TName] extends Dexie.Table<any, infer K> ? K : never;

export class QueryBuilder<
    Tables extends Record<string, Dexie.Table<any, any>>,
    TableName extends keyof Tables,
// AvailableFields extends string,
// SelectKeys extends string = keyof Row<Tables, TableName> & string
> {
    private db: Dexie & Tables;
    private tableName: TableName;

    private _limit?: number;
    private _offset?: number;
    private _orderBy?: keyof Row<Tables, TableName>;
    private _select?: (keyof Row<Tables, TableName>)[];
    private whereClauses: { field: keyof Row<Tables, TableName>; op: string; value: any }[] = [];
    private orClauses: SmartWhere<Row<Tables, TableName>>[] = [];
    private joinConfigs: JoinConfig<Row<Tables, TableName>, any, any, any>[] = [];

    constructor(db: Dexie & Tables, tableName: TableName) {
        this.db = db;
        this.tableName = tableName;
    }

    private get table(): Dexie.Table<Row<Tables, TableName>, Key<Tables, TableName>> {
        return this.db[this.tableName] as any;
    }

    /**
     * Adds a 'where' condition to the query, allowing you to specify filtering criteria.
     *
     * @param conditions - An object where each key is a field name and each value
     * is an operator describing the condition to be applied to that field.
     *
     * @returns The current QueryBuilder instance for method chaining.
     */
    where(conditions: SmartWhere<Row<Tables, TableName>>) {
        for (const key in conditions) {
            const clause = conditions[key as keyof Row<Tables, TableName>] as Operator<any>;
            if (clause) {
                this.whereClauses.push({ field: key as keyof Row<Tables, TableName>, op: clause.op, value: clause.value });
            }
        }
        return this;
    }

    /**
     * Adds multiple 'or' conditions to the query, allowing you to specify filtering criteria
     * that should be applied if any of the given conditions are true.
     *
     * @param conditions - An array of objects where each key is a field name and each value
     * is an operator describing the condition to be applied to that field.
     *
     * @returns The current QueryBuilder instance for method chaining.
     */
    or(conditions: SmartWhere<Row<Tables, TableName>>[]) {
        this.orClauses.push(...conditions);
        return this;
    }
    /**
     * Adds a 'where' condition to the query, allowing you to specify filtering criteria.
     * This is an alias for the `where` method.
     *
     * @param conditions - An object where each key is a field name and each value
     * is an operator describing the condition to be applied to that field.
     *
     * @returns The current QueryBuilder instance for method chaining.
     */
    andWhere(conditions: SmartWhere<Row<Tables, TableName>>) {
        return this.where(conditions);
    }

    /**
     * Adds a single 'or' condition to the query, allowing you to specify filtering criteria
     * that should be applied if any of the given conditions are true.
     *
     * This is an alias for the `or` method.
     *
     * @param conditions - An object where each key is a field name and each value
     * is an operator describing the condition to be applied to that field.
     *
     * @returns The current QueryBuilder instance for method chaining.
     */
    orWhere(conditions: SmartWhere<Row<Tables, TableName>>) {
        return this.or([conditions]);
    }
    /**
     * Adds a join configuration to the query, allowing you to join the current table
     * with another table based on specified local and foreign keys.
     *
     * @typeparam StoreName - The name of the table to join with, excluding the current table.
     * @typeparam LKey - The local key in the current table to join on.
     * @typeparam FKey - The foreign key in the store table to join on.
     * 
     * @param config - An object containing the join configuration, including:
     *   - `store`: The name of the table to join with.
     *   - `localKey`: The key in the current table to match.
     *   - `foreignKey`: The key in the store table to match.
     *   - `as`: The alias to use for the joined table.
     *
     * @returns The current QueryBuilder instance for method chaining.
     */
    join<
        StoreName extends Exclude<keyof Tables, TableName>,
        LKey extends keyof Row<Tables, TableName>,
        FKey extends keyof Row<Tables, StoreName>
    >(
        config: JoinConfig<
            Row<Tables, TableName>,
            Row<Tables, StoreName>,
            LKey,
            FKey
        > & { store: StoreName, }
    ) {

        // const builder = new QueryBuilder<Tables, TableName, any, SelectKeys>(this.db, this.tableName);
        // Object.assign(builder, this);
        // builder.joinConfigs = [...this.joinConfigs, config] as any;
        // return builder;
        this.joinConfigs.push(config);
        return this;
    }
    /**
     * Limits the number of items to be retrieved in the query result.
     *
     * @param value - The maximum number of items to return.
     * @returns The current QueryBuilder instance for method chaining.
     */
    limit(value: number) {
        this._limit = value;
        return this;
    }

    /**
     * Sets the offset for the query results, allowing you to skip a specified number of items.
     *
     * @param value - The number of items to skip in the query results.
     * @returns The current QueryBuilder instance for method chaining.
     */
    offset(value: number) {
        this._offset = value;
        return this;
    }

    /**
     * Sets the field by which the query results should be ordered.
     *
     * @param field - The field of the table to order the results by.
     * @returns The current QueryBuilder instance for method chaining.
     */
    orderBy(field: keyof Row<Tables, TableName>) {
        this._orderBy = field;
        return this;
    }

    /**
     * Selects the specified fields from the table, and returns a new QueryBuilder
     * instance.
     *
     * @param fields The fields to select.
     * @returns A new QueryBuilder instance with the specified fields selected.
     */
    select<K extends keyof Row<Tables, TableName>>(fields: K[]) {
        this._select = fields;
        return this;
    }


    /**
     * Retrieves an array of all items in the specified table that match the query
     * conditions specified in the `where()` and `orWhere()` methods.
     *
     * @returns A promise that resolves to an array of items from the specified table.
     */
    async findMany(): Promise<Row<Tables, TableName>[]> {
        let results = await this.table.toArray();
        if (this.whereClauses.length) {
            results = results.filter(item =>
                this.whereClauses.every(({ field, op, value }) => {
                    const val = item[field];
                    switch (op) {
                        case 'equals': return val === value;
                        case 'notEqual': return val !== value;
                        case 'startsWith': return typeof val === 'string' && val.startsWith(value);
                        case 'anyOf': return Array.isArray(value) && value.includes(val);
                        case 'above': return val > value;
                        case 'below': return val < value;
                        case 'between': return val >= value[0] && val <= value[1];
                        default: return true;
                    }
                })
            );
        }

        if (this.orClauses.length) {
            results = results.filter(item =>
                this.orClauses.some(group =>
                    Object.entries(group).every(([field, clause]) => {
                        const val = item[field as keyof Row<Tables, TableName>];
                        switch ((clause as Operator<any>).op) {
                            case 'equals': return val === (clause as Operator<any>).value;
                            case 'notEqual': return val !== (clause as Operator<any>).value;
                            case 'startsWith': return typeof val === 'string' && val.startsWith((clause as Operator<any>).value);
                            case 'anyOf': return Array.isArray((clause as Operator<any>).value) && (clause as Operator<any>).value.includes(val);
                            case 'above': return val > (clause as Operator<any>).value;
                            case 'below': return val < (clause as Operator<any>).value;
                            case 'between': {
                                const [low, high] = (clause as Operator<any>).value;
                                return val >= low && val <= high;
                            }
                            default: return false;
                        }
                    })
                )
            );
        }

        if (this._orderBy) results = results.sort((a, b) => (a[this._orderBy!] > b[this._orderBy!] ? 1 : -1));
        if (this._offset) results = results.slice(this._offset);
        if (this._limit) results = results.slice(0, this._limit);

        if (this._select) {
            results = results.map(row => {
                const selected: Partial<Row<Tables, TableName>> = {};
                this._select!.forEach(k => selected[k] = row[k]);
                return selected;
            }) as any;
        }
        // if (this._select) {
        //     results = results.map(row => {
        //         const selected: Partial<Row<Tables, TableName>> = {};
        //         for (const path of this._select!) {
        //             const value = path.split('.').reduce((acc, key) => acc?.[key], row);
        //             Dot.str(path, value, selected);
        //         }
        //         return selected;
        //     });
        // }
        //  for (const join of this.joinConfigs) {
        //     const foreignTable = this.db[join.store] as Dexie.Table<any, any>;
        //     const foreignRows = await foreignTable.toArray();

        //     results = results.map((row:any) => {
        //         const match = foreignRows.find(f =>
        //             f[join.foreignKey] === row[join.localKey]
        //         );
        //         return {
        //             ...row,
        //             [join.as]: match, // inject whole row under 'as'
        //         };
        //     });
        // }
        return results as any;
    }

    /**
     * Retrieves the first item from the specified table that matches the query
     * conditions specified in the `where()` and `orWhere()` methods.
     *
     * @returns A promise that resolves to the first matching item, or undefined if no items match.
     */
    async findOne(): Promise<Row<Tables, TableName> | undefined> {
        const res = await this.findMany();
        return res[0];
    }

    /**
     * Retrieves an item from the specified table using its primary key.
     *
     * @param id - The primary key of the item to retrieve.
     * 
     * @returns A promise that resolves to the item if found, or undefined if not found.
     */

    async findById(id: Key<Tables, TableName>): Promise<Row<Tables, TableName> | undefined> {
        return this.table.get(id);
    }

    /**
     * Updates a single item in the specified table using its primary key.
     *
     * @param id - The primary key of the item to be updated.
     * @param data - An object containing the fields and values to update.
     *
     * @returns The updated item, or undefined if the item was not found.
     */
    async update(id: Key<Tables, TableName>, data: Partial<Row<Tables, TableName>>) {
        return this.table.update(id, data as any);
    }

    /**
     * Updates multiple items in the specified table using their primary keys.
     *
     * @param ids - An array of primary keys of the items to be updated.
     * @param data - An object containing the fields and values to update.
     *
     * @returns A promise that resolves once all items have been updated.
     */
    async updateMany(ids: Key<Tables, TableName>[], data: Partial<Row<Tables, TableName>>) {
        return Promise.all(ids.map(id => this.table.update(id, data as any)));
    }

    /**
     * Deletes an item from the specified table using its primary key.
     *
     * @param id - The primary key of the item to delete.
     *
     * @returns A promise that resolves once the item has been deleted.
     */

    async delete(id: Key<Tables, TableName>) {
        return this.table.delete(id);
    }

    /**
     * Deletes multiple items from the specified table by their primary keys.
     *
     * @param ids - An array of primary keys of the items to be deleted.
     *
     * @returns A promise that resolves once all items have been deleted.
     */
    async deleteMany(ids: Key<Tables, TableName>[]) {
        return Promise.all(ids.map(id => this.table.delete(id)));
    }

    /**
     * Retrieves multiple records from the database and returns both the data and the count of records.
     *
     * @returns A promise that resolves to an object containing:
     * - `data`: An array of records retrieved from the database.
     * - `count`: The total number of records retrieved.
     */

    async findAndCount(): Promise<{ data: Row<Tables, TableName>[] | undefined, count: number }> {
        const data = await this.findMany();
        return { data, count: data.length };
    }
}
