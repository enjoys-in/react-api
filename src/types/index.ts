export type IsPlainObject<T> = T extends object
  ? T extends (...args: any[]) => any
  ? false
  : T extends any[]
  ? false
  : T extends Date
  ? false
  : true
  : false;
export type Prettify<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

export type DeepPrettify<T> = T extends object
  ? T extends (...args: any[]) => any
  ? T
  : T extends any[]
  ? { [K in keyof T]: DeepPrettify<T[K]> }
  : {
    [K in keyof T]: DeepPrettify<T[K]>;
  } extends infer O
  ? { [K in keyof O]: O[K] }
  : never
  : T;
