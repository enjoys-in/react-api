import { type EntityTable, InsertType, Table } from "dexie";
type FlatKeys<T> = {
    [K in keyof T]: T[K] extends object
    ? T[K] extends Array<any>
    ? never
    : K
    : K;
}[keyof T] &
    string;

type CommaString<PK extends string, Extras extends string> =
    | `++${PK}`
    | `++${PK},${Extras}`;

type PrimaryKeyFromTable<T> = T extends Table<
    infer R,
    any,
    InsertType<infer R2, infer PK>
>
    ? R extends R2
    ? PK
    : never
    : never;

export type CreatePKTableSchema<
    T extends Record<string, Table<any, any, any>>
> = {
        [K in keyof T]: T[K] extends Table<infer R, any, any>
        ? CommaString<
            PrimaryKeyFromTable<T[K]>,
            Exclude<FlatKeys<R>, PrimaryKeyFromTable<T[K]>>
        >
        : never;
    };

export type SchemaForTables<
    TSchemas extends Record<string, any>,
    PKMap extends { [K in keyof TSchemas]: keyof TSchemas[K] }
> = {
        readonly [K in keyof TSchemas]: EntityTable<TSchemas[K], PKMap[K]>;
    };

export type TableValue<T> = T extends Table<infer U, any> ? U : never;
type QueryOperator = "equals" | "anyOf" | "above" | "below" | "between";
export type PrimaryKeyType<
    Tables,
    T extends keyof Tables
> = Tables[T] extends Table<infer U, infer PK> ? PK : never;

export type Primitive =
    | string
    | number
    | boolean
    | bigint
    | symbol
    | null
    | undefined;
export type BuildNested<Value, Keys extends string[]> = Keys extends [
    infer Head extends string,
    ...infer Rest extends string[]
]
    ? { [K in Head]: BuildNested<Value, Rest> }
    : Value;
// Helper: Prepend parent key to child keys
export type PrefixKeys<Prefix extends string, T> = {
    [K in keyof T & string as `${Prefix}.${K}`]: T[K];
};

export type NestedToDotPath<T, Prefix extends string = ""> = {
    [K in keyof T & string]: T[K] extends object
    ? T[K] extends Array<any>
    ? Prefix extends ""
    ? { [P in K]: T[K] }
    : { [P in `${Prefix}.${K}`]: T[K] }
    : Prefix extends ""
    ? NestedToDotPath<T[K], K>
    : NestedToDotPath<T[K], `${Prefix}.${K}`>
    : Prefix extends ""
    ? { [P in K]: T[K] }
    : { [P in `${Prefix}.${K}`]: T[K] };
}[keyof T & string];

export type Merge<A, B> = {
    [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
    ? A[K] extends object
    ? B[K] extends object
    ? Merge<A[K], B[K]>
    : B[K]
    : B[K]
    : B[K]
    : K extends keyof A
    ? A[K]
    : never;
};

// Main type: Converts a dot-path-keyed object into a deeply nested one
export type DotPathToNested<T extends Record<string, any>> = {
    [K in keyof T]: BuildNested<T[K], Split<Extract<K, string>>>;
} extends infer Mapped
    ? UnionToIntersection<Mapped[keyof Mapped]>
    : never;

// Helper: Convert union to intersection
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
    x: infer R
) => void
    ? R
    : never;

export type OnlyNestedKeys<T, Prefix extends string = ""> = {
    [K in keyof T]: T[K] extends Primitive | Function | Array<any>
    ? `${Prefix}${K & string}`
    : T[K] extends object
    ? `${Prefix}${K & string}` | OnlyNestedKeys<T[K], `${Prefix}${K & string}.`>
    : never;
}[keyof T];

type Prev = [never, 0, 1, 2, 3, 4, 5];



type IsPlainObject<T> = T extends object
    ? T extends any[]
    ? false
    : T extends Function
    ? false
    : true
    : false;

export type NestedKeys<T, D extends number = 5> = [D] extends [never]
    ? never
    : T extends object
    ? {
        [K in keyof T & string]: IsPlainObject<T[K]> extends true
        ? K | `${K}.${NestedKeys<T[K], Prev[D]>}`
        : K;
    }[keyof T & string]
    : never;
export type NestedValueFromPath<
    T,
    P extends string
> = P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
    ? NestedValueFromPath<T[Key], Rest>
    : never
    : P extends keyof T
    ? T[P]
    : never;

export type Split<
    S extends string,
    Delimiter extends string = "."
> = S extends `${infer Head}${Delimiter}${infer Tail}`
    ? [Head, ...Split<Tail, Delimiter>]
    : [S];

type DeepValue<T, Parts extends string[]> = Parts extends [
    infer First,
    ...infer Rest
]
    ? First extends keyof T
    ? Rest extends string[]
    ? DeepValue<T[First], Rest>
    : T[First]
    : never
    : T;

export type PathValue<T, P extends string> = DeepValue<T, Split<P>>;

type TableKeys<T> = keyof T;
export type TableSchema<T> = {
    [tableName in TableKeys<T>]: string;
};
export type UpdatesForTable<T> = {
    [K in NestedKeys<T>]?: PathValue<T, K>;
};

export type PartialUpdatesForTable<Tables, T extends keyof Tables> = Partial<{
    [P in NestedKeys<Tables[T]>]: PathValue<Tables[T], P>;
}>;

export type FieldType<
    Tables,
    T extends keyof Tables,
    P extends NestedKeys<Tables[T]>
> = PathValue<Tables[T], P>;

export type QueryWhere<Tables, K extends keyof Tables> = {
    field: keyof Tables[K];
    operator?: QueryOperator;
    value: any;
};

export type QueryOptions<Tables, K extends keyof Tables> = {
    where?: QueryWhere<Tables, K>;
    sortBy?: keyof Tables[K];
    offset?: number;
    limit?: number;
    reverse?: boolean;
    count?: boolean;
    each?: (item: Tables[K]) => void;
    primaryKeys?: boolean;
    raw?: boolean;
};

// ---- Change Log for Generic Tables ----

export interface IDatabaseChange<Tables = Record<string, any>> {
    source: any;
    table: keyof Tables;
    key: string;
    type: number;
    mods: Partial<Tables[keyof Tables]>; // updated fields
    oldObj: Tables[keyof Tables]; // old object
    obj: Tables[keyof Tables]; // new object
    rev: number;
}
