import { Operator } from "idb/operator";

export type OperatorType =
  | 'equals'
  | 'notEqual'
  | 'startsWith'
  | 'anyOf'
  | 'above'
  | 'below'
  | 'between'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte';

export type BaseOperator<T> = {
  op: OperatorType;
  value: T | T[] | [T, T];
};

export type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
  ? `${Prefix}${K & string}` | DotPaths<T[K], `${Prefix}${K & string}.`>
  : `${Prefix}${K & string}`;
}[keyof T];
export type SelectableFields<Main, Joins extends Record<string, any>> =
  keyof Main | DotPaths<Joins>;

export type SmartWhere<T> = Partial<{
  [K in keyof T]?: Operator<T[K]> | { [key: string]: T[K] };
}>;

export type JoinConfig<
  LocalTable,
  ForeignTable,
  LocalKey extends keyof LocalTable,
  ForeignKey extends keyof ForeignTable
> = {
  store: string;         // Store name to join with
  localKey: LocalKey;    // Key in local table
  foreignKey: ForeignKey;// Key in joined table
  as: string;            // Alias for joined object
};
