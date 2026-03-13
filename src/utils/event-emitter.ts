type ChangeListener = () => void;

export class EventEmitter {
  private listeners: Set<ChangeListener> = new Set();

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(`${this.constructor.name} listener error:`, e);
      }
    }
  }
}
