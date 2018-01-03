interface Options<A> {
  promise?: PromiseLike<A>
}

declare class PromisePool<A> extends EventTarget {
  constructor(
    source: () => PromiseLike<A>|void,
    concurrency: number,
    options?: Options<A>
  )
  concurrency(concurrency: number): number
  size(): number
  active(): boolean
  promise(): Promise<A>
  start(): Promise<A>
}

export default PromisePool
