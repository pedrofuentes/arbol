export class SelectionManager {
  private selectedIds = new Set<string>();

  get ids(): Set<string> {
    return new Set(this.selectedIds);
  }

  get count(): number {
    return this.selectedIds.size;
  }

  get hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  toggle(nodeId: string): void {
    if (this.selectedIds.has(nodeId)) {
      this.selectedIds.delete(nodeId);
    } else {
      this.selectedIds.add(nodeId);
    }
  }

  clear(): void {
    this.selectedIds.clear();
  }

  isSelected(nodeId: string): boolean {
    return this.selectedIds.has(nodeId);
  }

  toArray(): string[] {
    return Array.from(this.selectedIds);
  }
}
