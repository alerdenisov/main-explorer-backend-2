export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>
};

export interface Func<TOut> {
  (): TOut;
}
export interface Func1<TIn, TOut> {
  (arg: TIn): TOut;
}
export interface Func2<TIn1, TIn2, TOut> {
  (arg1: TIn1, arg2: TIn2): TOut;
}
export interface Func3<TIn1, TIn2, TIn3, TOut> {
  (arg1: TIn1, arg2: TIn2, arg3: TIn3): TOut;
}
export interface Func4<TIn1, TIn2, TIn3, TIn4, TOut> {
  (arg1: TIn1, arg2: TIn2, arg3: TIn3, arg4: TIn4): TOut;
}
export interface Func5<TIn1, TIn2, TIn3, TIn4, TIn5, TOut> {
  (arg1: TIn1, arg2: TIn2, arg3: TIn3, arg4: TIn4, arg5: TIn5): TOut;
}
// export type Func<TOut> = () => TOut
// export type Func<TOut, T0> = (arg0: T0) => TOut
// export type Func<TOut, T0, T1> = (arg0: T0,arg1: T1) => TOut
// export interface Func<R=void, P1=never, P2=never, P3=never, P4=never> {  (param1: P1, param2: P2, param3: P3, param4: P4): R; }
