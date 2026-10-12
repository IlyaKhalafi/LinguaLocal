"use client";

import {
  recordingCapacity,
  recordingSchema,
  readRecording,
  storedRecordingSchema,
  type Recording,
} from "./recording";

const databaseName = "lingualocal-recordings";
const storeName = "clips";
const eventName = "lingualocal-recordings-changed";
let opening: Promise<IDBDatabase> | undefined;
let tabId: string | undefined;

function source() {
  return (tabId ??= Math.random().toString(36).slice(2));
}

function database() {
  if (opening) return opening;
  const pending: Promise<IDBDatabase> = new Promise<IDBDatabase>(
    (resolve, reject) => {
      let settled = false;
      const request = indexedDB.open(databaseName, 1);
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            if (opening === pending) opening = undefined;
          };
          db.onclose = () => {
            if (opening === pending) opening = undefined;
          };
          resolve(db);
        }
      };
      const timeout = setTimeout(
        () => finish(new Error("storage-unavailable")),
        15_000,
      );
      request.onupgradeneeded = () => {
        if (settled) {
          request.transaction?.abort();
          return;
        }
        if (!request.result.objectStoreNames.contains(storeName))
          request.result.createObjectStore(storeName, { keyPath: "id" });
      };
      request.onsuccess = () => {
        if (settled) request.result.close();
        else finish();
      };
      request.onerror = () => finish(new Error("storage-unavailable"));
    },
  ).catch((error: unknown) => {
    if (opening === pending) opening = undefined;
    throw error;
  });
  opening = pending;
  return opening;
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    result: (value: T) => void,
    fail: (error: unknown) => void,
  ) => void,
  retried = false,
) {
  const connection = database();
  const db = await connection;
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, mode);
    } catch (error) {
      db.close();
      if (opening === connection) opening = undefined;
      if (
        !retried &&
        error instanceof DOMException &&
        error.name === "InvalidStateError"
      )
        resolve(transaction(mode, operation, true));
      else reject(error);
      return;
    }
    let value: T;
    let failure: unknown;
    const timeout = setTimeout(() => {
      failure = new Error("storage-timeout");
      try {
        tx.abort();
      } catch {
        // A transaction already committing must finish before reporting success.
      }
    }, 60_000);
    tx.oncomplete = () => {
      clearTimeout(timeout);
      resolve(value);
    };
    tx.onabort = () => {
      clearTimeout(timeout);
      reject(failure || tx.error || new Error("storage-unavailable"));
    };
    const fail = (error: unknown) => {
      failure = error;
      tx.abort();
    };
    try {
      operation(
        tx.objectStore(storeName),
        (result) => {
          value = result;
        },
        fail,
      );
    } catch (error) {
      fail(error);
    }
  });
}

function changed() {
  window.dispatchEvent(new Event(eventName));
  try {
    const channel = new BroadcastChannel(eventName);
    channel.postMessage({ source: source() });
    channel.close();
  } catch {
    // Window focus still refreshes recordings when channels are unavailable.
  }
}

export function listRecordings() {
  return transaction<{ records: Recording[]; unreadable: number }>(
    "readonly",
    (store, result) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result.flatMap((value) => {
          const parsed = readRecording(value);
          return parsed ? [parsed] : [];
        });
        result({
          records: records.sort((a, b) => b.createdAt - a.createdAt),
          unreadable: request.result.length - records.length,
        });
      };
    },
  );
}

export async function saveRecording(input: Recording) {
  const next = recordingSchema.parse(input);
  const { blob, ...metadata } = next;
  const stored = storedRecordingSchema.parse({
    ...metadata,
    mimeType: blob.type,
    data: await blob.arrayBuffer(),
  });
  await transaction<void>("readwrite", (store, result, fail) => {
    const request = store.getAll();
    request.onsuccess = () => {
      try {
        const records = request.result.map((value) => ({
          id: typeof value?.id === "string" ? value.id : "",
          blob: {
            size:
              value?.data instanceof ArrayBuffer
                ? value.data.byteLength
                : value?.blob instanceof Blob
                  ? value.blob.size
                  : 0,
          },
        }));
        if (!recordingCapacity(records, next))
          throw new Error("recordings-full");
        store.put(stored);
        result(undefined);
      } catch (error) {
        // Abort the whole transaction so an existing take is never replaced.
        fail(error);
      }
    };
  });
  changed();
}

export async function removeRecording(id: string) {
  recordingSchema.shape.id.parse(id);
  await transaction<void>("readwrite", (store, result) => {
    store.delete(id);
    result(undefined);
  });
  changed();
}

export async function removeUnreadableRecordings() {
  await transaction<void>("readwrite", (store, result) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) result(undefined);
      else {
        if (
          !storedRecordingSchema.safeParse(cursor.value).success &&
          !recordingSchema.safeParse(cursor.value).success
        )
          cursor.delete();
        cursor.continue();
      }
    };
  });
  changed();
}

export function subscribeRecordings(refresh: () => void) {
  window.addEventListener(eventName, refresh);
  window.addEventListener("focus", refresh);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(eventName);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        !event.data ||
        typeof event.data !== "object" ||
        !("source" in event.data) ||
        event.data.source !== source()
      )
        refresh();
    };
  } catch {
    // Local events and window focus remain available.
  }
  return () => {
    window.removeEventListener(eventName, refresh);
    window.removeEventListener("focus", refresh);
    channel?.close();
  };
}
