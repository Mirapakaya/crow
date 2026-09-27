/**
 * Type-safe event emitter for Crow.
 *
 * Declare an event map interface, then instantiate `EventEmitter<T>`
 * to get fully typed `on` / `emit` calls with zero runtime overhead.
 *
 * @example
 * ```ts
 * interface MyEvents {
 *   'message-sent': { id: string };
 *   'peer-online':  { pubKey: string };
 * }
 * const bus = new EventEmitter<MyEvents>();
 * bus.on('message-sent', (d) => console.log(d.id));
 * bus.emit('message-sent', { id: 'abc' });
 * ```
 */

/**
 * A strongly-typed event emitter.
 *
 * `T` maps event names to their payload types.  Subscriptions return
 * an unsubscribe function for easy cleanup.
 */
export class EventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(data: any) => void>>();

  /**
   * Subscribe to an event.
   *
   * @returns An unsubscribe function.
   */
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as (data: any) => void);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event, but only fire once then auto-unsubscribe.
   *
   * @returns An unsubscribe function (can be called before the event fires).
   */
  once<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    const wrapper = (data: T[K]) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Emit an event, invoking all current subscribers.
   */
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Iterate over a snapshot so that handlers can unsubscribe during iteration.
    for (const handler of Array.from(set)) {
      try {
        handler(data);
      } catch {
        // Swallow handler errors so one bad listener doesn't break others.
      }
    }
  }

  /**
   * Remove a specific handler from an event.
   */
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler as (data: any) => void);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  /**
   * Remove all handlers for a specific event, or for every event
   * if no argument is provided.
   */
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
