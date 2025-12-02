import { storage } from '#imports';
import { StorageType } from '@/lib/types';
import { formatSessionKey } from '@/lib/utils';

export default class StorageService {
  async setItem<T>(key: string, value: T, type: StorageType) {
    await storage.setItem(formatSessionKey(type, key), value);
  }

  async getItem<T>(key: string, type: StorageType): Promise<T | null> {
    return await storage.getItem<T>(formatSessionKey(type, key));
  }
}