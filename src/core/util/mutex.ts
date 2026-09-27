/**
 * Async mutex for Crow.
 *
 * Used to serialise access to shared resources (e.g. the relay
 * publish queue, the key store) without blocking the JS event loop.
 */

/**
 * A lightweight async mutex.
 *
 * Callers either use `lock()` to obtain an explicit unlock function
 * or the convenience `withLock()` for scoped access.
 *
 * @example
 * ```ts
 * const mutex = new Mutex();
 *
 * // Explicit lock / unlock:
 * const unlock = await mutex.lock();
 * try { … } finally { unlock(); }
 *
 * // Convenience wrapper:
 * const result = await mutex.withLock(async () => criticalWork());
 * ```
 */
export class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  /**
   * Acquire the mutex.
   *
   * Resolves immediately if the mutex is free; otherwise the caller
   * is queued and will resolve once all preceding holders have
   * released their locks.
   *
   * @returns An **unlock function** that must be called exactly once.
   */
  lock(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(unlock);
        } else {
          this.queue.push(tryAcquire);
        }
      };

      const unlock = () => {
        const next = this.queue.shift();
        if (next) {
          // Hand the lock directly to the next waiter.
          next();
        } else {
          this.locked = false;
        }
      };

      tryAcquire();
    });
  }

  /**
   * Convenience wrapper that acquires the mutex, runs `fn`, and
   * releases the lock when the promise settles (even on error).
   *
   * @returns Whatever `fn` returns.
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const unlock = await this.lock();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }
}
