type ChangeListener<T = void> = T extends void ? () => void : (payload: T) => void;

export class EventEmitter<T = void> {
  private listeners: Set<ChangeListener<T>> = new Set();

  onChange(listener: ChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(...args: T extends void ? [] : [T]): void {
    for (const listener of this.listeners) {
      try {
        (listener as Function)(...args);
      } catch (e) {
        console.error(`${this.constructor.name} listener error:`, e);
      }
    }
  }
}
