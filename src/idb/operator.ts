
export const equals = <T>(value: T) => ({ op: 'equals', value } as const);
export const notEqual = <T>(value: T) => ({ op: 'notEqual', value } as const);
export const startsWith = <T>(value: T) => ({ op: 'startsWith', value } as const);
export const anyOf = <T>(value: T[]) => ({ op: 'anyOf', value } as const);
export const above = <T>(value: T) => ({ op: 'above', value } as const);
export const below = <T>(value: T) => ({ op: 'below', value } as const);
export const between = <T>(range: [T, T]) => ({ op: 'between', value: range } as const);
export const $gt = above;
export const $lt = below;
export const $gte = <T>(value: T) => ({ op: 'gte', value } as const);
export const $lte = <T>(value: T) => ({ op: 'lte', value } as const);
export type Operator<T> =
  | ReturnType<typeof equals<T>>
  | ReturnType<typeof notEqual<T>>
  | ReturnType<typeof startsWith<T>>
  | ReturnType<typeof anyOf<T>>
  | ReturnType<typeof above<T>>
  | ReturnType<typeof below<T>>
  | ReturnType<typeof between<T>>
  | ReturnType<typeof $gt<T>>
  | ReturnType<typeof $lt<T>> 
  | ReturnType<typeof $gte<T>>
  | ReturnType<typeof $lte<T>>