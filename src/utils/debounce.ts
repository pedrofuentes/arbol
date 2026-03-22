export type DebouncedFn<T extends (...args: never[]) => void> = T & { flush: () => void };

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = latestArgs;
      latestArgs = null;
      if (a !== null) fn(...a);
    }, ms);
  }) as DebouncedFn<T>;

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      const a = latestArgs;
      latestArgs = null;
      if (a !== null) fn(...a);
    }
  };

  return debounced;
}
