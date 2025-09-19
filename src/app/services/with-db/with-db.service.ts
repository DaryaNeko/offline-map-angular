import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export abstract class WithDbService {
  protected idbName: string;
  protected storeName: string;
  protected keyPath: string;

  private idbVersion = 1;
  private idb: IDBDatabase | null = null;

  constructor(idbName: string, storeName: string, keyPath: string) {
    this.idbName = idbName;
    this.storeName = storeName;
    this.keyPath = keyPath;
    
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.idbName, this.idbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.idb = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: this.keyPath });
        }
      };
    });
  }

  protected async getDataFromIDB(name: string): Promise<ArrayBuffer | null> {
    if (!this.idb) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.idb!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
    });
  }

  protected async saveDataToIDB(name: string, data: ArrayBuffer): Promise<void> {
    if (!this.idb) return;

    return new Promise((resolve, reject) => {
      const transaction = this.idb!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ name, data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}