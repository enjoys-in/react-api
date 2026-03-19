import { type EntityTable, InsertType, Table } from "dexie";

/**
 * Extracts the primary key property name from a Table/EntityTable type.
 * Works with EntityTable<T, PK> which internally uses InsertType<T, PK>.
 */
type PrimaryKeyFromTable<T> = T extends Table<
    infer R,
    any,
    InsertType<infer R2, infer PK>
>
    ? R extends R2
    ? PK & string
    : never
    : never;

/** Deterministically picks one element from a union to iterate without distribution. */
type LastInUnion<U> =
    UnionToIntersection<U extends any ? () => U : never> extends () => infer Last
    ? Last
    : never;

/**
 * Generates all non-empty subsets of a string union as comma-separated strings.
 * Each subset appears exactly once — no duplicate orderings.
 * Depth-limited to prevent type explosion on wide schemas.
 *
 * Example: FieldCombinations<'a' | 'b' | 'c'>
 *   = 'a' | 'b' | 'c' | 'a,b' | 'a,c' | 'b,c' | 'a,b,c'
 */
type FieldCombinations<
    T extends string,
    Depth extends any[] = []
> = [T] extends [never]
    ? never
    : Depth['length'] extends 4
    ? T
    : LastInUnion<T> extends infer Head extends string
    ? Exclude<T, Head> extends infer Rest
    ? [Rest] extends [never]
    ? Head
    : Rest extends string
    ? Head
    | FieldCombinations<Rest, Depth>
    | `${Head},${FieldCombinations<Rest, [...Depth, 0]>}`
    : Head
    : Head
    : never;

/**
 * Builds the schema string type for a Dexie table.
 * The primary key can be prefixed with ++ (auto-increment) or used as-is.
 * Remaining fields are suggested via autocomplete as comma-separated values.
 */
type IndexSchemaString<PK extends string, OtherFields extends string> =
    [OtherFields] extends [never]
    ? `++${PK}` | PK
    : | `++${PK}`
    | PK
    | `++${PK},${FieldCombinations<OtherFields>}`
    | `${PK},${FieldCombinations<OtherFields>}`;

/**
 * Resolves the schema string type for a single table entry.
 * If the table is an EntityTable (with InsertType), it provides full
 * autocomplete for the PK and all other fields.
 * Falls back to `string` for plain Table<> without a named PK.
 */
type TableSchemaString<T> = T extends Table<
    infer Entity,
    any,
    InsertType<infer _R, infer PK>
>
    ? _R extends Entity
    ? PK extends string
    ? IndexSchemaString<PK, Exclude<keyof Entity & string, PK>>
    : string
    : string
    : string;

/**
 * @deprecated Use {@link TableSchema} instead. Kept for backward compatibility.
 */
export type CreatePKTableSchema<
    T extends Record<string, Table<any, any, any>>
> = TableSchema<T>;

export type SchemaForTables<
    TSchemas extends Record<string, any>,
    PKMap extends { [K in keyof TSchemas]: keyof TSchemas[K] }
> = {
        readonly [K in keyof TSchemas]: EntityTable<TSchemas[K], PKMap[K]>;
    };

export type TableValue<T> = T extends Table<infer U, any> ? U : never;
export type TableInsertType<T> = T extends Table<any, any, infer I> ? I : never;
export type QueryOperator =
    | "equals"
    | "anyOf"
    | "above"
    | "below"
    | "between"
    | "aboveOrEqual"
    | "belowOrEqual"
    | "noneOf"
    | "notEqual"
    | "startsWith"
    | "startsWithAnyOf"
    | "inAnyRange";
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

export type TableSchema<T> = {
    [K in keyof T]: TableSchemaString<T[K]>;
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
    [F in NestedKeys<TableValue<Tables[K]>>]: {
        field: F;
        operator?: QueryOperator;
        value: PathValue<TableValue<Tables[K]>, F> | PathValue<TableValue<Tables[K]>, F>[];
    };
}[NestedKeys<TableValue<Tables[K]>>];

export type QueryOptions<Tables, K extends keyof Tables> = {
    where?: QueryWhere<Tables, K>;
    sortBy?: NestedKeys<TableValue<Tables[K]>>;
    offset?: number;
    limit?: number;
    reverse?: boolean;
    count?: boolean;
    each?: (item: TableValue<Tables[K]>) => void;
    primaryKeys?: boolean;
    raw?: boolean;
};

// ---- Change Log for Generic Tables ----

export interface IDatabaseChange<Tables = Record<string, any>> {
    source: unknown;
    table: keyof Tables;
    key: PrimaryKeyType<Tables, keyof Tables>;
    type: 1 | 2 | 3;
    mods: Partial<TableValue<Tables[keyof Tables]>>;
    oldObj: TableValue<Tables[keyof Tables]>;
    obj: TableValue<Tables[keyof Tables]>;
    rev: number;
}
