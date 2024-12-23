export class EventCache {
  private cache: Map<string, boolean> = new Map();

  getCacheKey(address: string, epoch: number): string {
    return `${address.toLowerCase()}-${epoch}`;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  set(key: string): void {
    this.cache.set(key, true);
  }
}