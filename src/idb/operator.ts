
export const equals = <T>(value: T) => ({ op: 'equals', value } as const);
export const notEqual = <T>(value: T) => ({ op: 'notEqual', value } as const);
export const startsWith = <T>(value: T) => ({ op: 'startsWith', value } as const);
export const anyOf = <T>(value: T[]) => ({ op: 'anyOf', value } as const);
export const above = <T>(value: T) => ({ op: 'above', value } as const);
export const below = <T>(value: T) => ({ op: 'below', value } as const);
export const between = <T>(range: [T, T]) => ({ op: 'between', value: range } as const);
export const aboveOrEqual = <T>(value: T) => ({ op: 'aboveOrEqual', value } as const);
export const belowOrEqual = <T>(value: T) => ({ op: 'belowOrEqual', value } as const);
export const noneOf = <T>(value: T[]) => ({ op: 'noneOf', value } as const);
export const inAnyRange = <T>(ranges: [T, T][]) => ({ op: 'inAnyRange', value: ranges } as const);
export const startsWithAnyOf = (value: string[]) => ({ op: 'startsWithAnyOf', value } as const);
export const $gt = above;
export const $lt = below;
export const $gte = aboveOrEqual;
export const $lte = belowOrEqual;
export type Operator<T> =
  | ReturnType<typeof equals<T>>
  | ReturnType<typeof notEqual<T>>
  | ReturnType<typeof startsWith<T>>
  | ReturnType<typeof anyOf<T>>
  | ReturnType<typeof above<T>>
  | ReturnType<typeof below<T>>
  | ReturnType<typeof between<T>>
  | ReturnType<typeof aboveOrEqual<T>>
  | ReturnType<typeof belowOrEqual<T>>
  | ReturnType<typeof noneOf<T>>
  | ReturnType<typeof inAnyRange<T>>
  | ReturnType<typeof startsWithAnyOf>