'use strict';

export class IndexedDB {
  utils: Utils;
  dbWrapper: DbWrapper;

  constructor(dbName: string, version: number) {
    this.utils = new Utils();
    this.dbWrapper = new DbWrapper(dbName, version);
  }

  openDatabase(
    version: number,
    upgradeCallback?: (evt: any, db: IDBDatabase) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.dbVersion = version;
      const request = this.utils.indexedDB.open(this.dbWrapper.dbName, version);
      request.onsuccess = (e) => {
        this.dbWrapper.db = request.result;
        resolve(e);
      };

      request.onerror = function (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject('IndexedDB error: ' + (e.target as any).errorCode);
      };

      if (typeof upgradeCallback === 'function') {
        request.onupgradeneeded = (e) => {
          // Cast to the in-progress IDBDatabase before the onsuccess fires;
          // request.result is the same handle that we later store on dbWrapper.
          upgradeCallback(e, request.result);
        };
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByKey(storeName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });

      const objectStore = transaction.objectStore(storeName);
      const request: IDBRequest = objectStore.get(key);
      request.onsuccess = (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve((event.target as any).result);
      };
    });
  }

  getAll(
    storeName: string,
    keyRange?: IDBKeyRange,
    indexDetails?: IndexDetails
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });
      const objectStore = transaction.objectStore(storeName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = [];
      let request: IDBRequest;

      if (indexDetails) {
        const index = objectStore.index(indexDetails.indexName),
          order = indexDetails.order === 'desc' ? 'prev' : 'next';
        request = index.openCursor(keyRange, order as IDBCursorDirection);
      } else {
        request = objectStore.openCursor(keyRange);
      }

      request.onerror = (e) => {
        reject(e);
      };

      request.onsuccess = function (evt: Event) {
        const cursor = (evt.target as IDBRequest<IDBCursorWithValue | null>)
          .result;
        if (cursor) {
          result.push(cursor.value);
          cursor.continue();
        } else {
          resolve(result);
        }
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(storeName: string, value: any, key?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          resolve({ key: key, value: value });
        }
      });
      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.add(value, key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.onsuccess = (evt: any) => {
        key = evt.target.result;
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(storeName: string, value: any, key?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          resolve(value);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);

      objectStore.put(value, key);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(storeName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);

      objectStore.delete(key);
    });
  }

  openCursor(
    storeName: string,
    cursorCallback: (evt: Event) => void,
    keyRange?: IDBKeyRange
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.openCursor(keyRange);

      request.onsuccess = (evt: Event) => {
        cursorCallback(evt);
        resolve(evt);
      };
    });
  }

  clear(storeName: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);
      objectStore.clear();
      resolve(null);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByIndex(storeName: string, indexName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        abort: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index(indexName);
      const request = index.get(key);

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
    });
  }
}

export class Utils {
  indexedDB: IDBFactory;

  constructor() {
    this.indexedDB =
      window.indexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mozIndexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitIndexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).msIndexedDB;
  }
}

export interface IndexDetails {
  indexName: string;
  order: string;
}

export class DbWrapper {
  dbName: string;
  dbVersion: number;
  db: IDBDatabase | null;

  constructor(dbName: string, version: number) {
    this.dbName = dbName;
    this.dbVersion = version || 1;
    this.db = null;
  }

  validateStoreName(storeName: string) {
    return this.db?.objectStoreNames.contains(storeName) ?? false;
  }

  validateBeforeTransaction(storeName: string, reject: (e: string) => void) {
    if (!this.db) {
      reject(
        'You need to use the createStore function to create a database before you query it!'
      );
    }
    if (!this.validateStoreName(storeName)) {
      reject('objectStore does not exists: ' + storeName);
    }
  }

  createTransaction(options: {
    storeName: string;
    dbMode: IDBTransactionMode;
    error: (this: IDBTransaction, ev: Event) => void;
    complete: (this: IDBTransaction, ev: Event) => void;
    abort?: (this: IDBTransaction, ev: Event) => void;
  }): IDBTransaction {
    if (!this.db) {
      throw new Error('createTransaction: db not initialised');
    }
    const trans: IDBTransaction = this.db.transaction(
      options.storeName,
      options.dbMode
    );
    trans.onerror = options.error;
    trans.oncomplete = options.complete;
    trans.onabort = options.abort ?? null;
    return trans;
  }
}
