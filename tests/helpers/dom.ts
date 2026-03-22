/**
 * Create a fresh <div> container and append it to document.body.
 * Use with {@link cleanupTestContainer} in afterEach.
 */
export function createTestContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

/**
 * Remove a test container from the DOM.
 */
export function cleanupTestContainer(container: HTMLElement): void {
  container.remove();
}
