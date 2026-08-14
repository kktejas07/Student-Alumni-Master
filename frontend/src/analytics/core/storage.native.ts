/**
 * frontend/src/analytics/core/storage.native.ts
 *
 * Native platform stub implementation of offline queue storage using AsyncStorage.
 */

export async function saveOfflineQueue(queue: any[]): Promise<void> {
  throw new Error('NotImplementedYet: storage.native.saveOfflineQueue');
}

export async function loadOfflineQueue(): Promise<any[]> {
  throw new Error('NotImplementedYet: storage.native.loadOfflineQueue');
}
