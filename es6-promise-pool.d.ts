type PromiseConstructorLike = new (
  executor: (
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
  ) => void
) => PromiseLike<any>;

type EventListener = (evt: PromisePoolEvent) => void;

interface EventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(evt: PromisePoolEvent): void;
}

interface IteratorResult<T> {
  value?: T;
  done: boolean;
}

interface Iterator<T> {
  next(): IteratorResult<T>;
}

interface PromisePoolEvent {
  target: PromisePool;
  type: string;
  data: any;
}

interface PromisePoolOptions {
  promise?: PromiseConstructorLike;
}

declare class PromisePool implements EventTarget {
  constructor(
    source: Iterator<Promise<any>> | Promise<any> | (() => Promise<any>),
    concurrency: number,
    options?: PromisePoolOptions
  );

  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(evt: PromisePoolEvent): void;

  concurrency(value?: number): number;
  size(): number;
  active(): boolean;
  promise(): Promise<void> | null;
  start(): Promise<void>;
}

export = PromisePool;
