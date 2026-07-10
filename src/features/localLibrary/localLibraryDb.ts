import {
  LIBRARY_DATABASE_NAME,
  LIBRARY_DATABASE_VERSION,
  createDefaultLibrarySubjects,
} from "./constants";
import type { LibrarySnapshot, LibrarySubject, LocalResource, StoredResourceFile } from "./types";

const SUBJECT_STORE = "subjects";
const RESOURCE_STORE = "resources";
const FILE_STORE = "files";
const META_STORE = "meta";
const SEEDED_KEY = "default-subjects-seeded";

interface MetaRecord {
  key: string;
  value: boolean;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本地数据库操作失败"));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("本地数据库事务失败"));
    transaction.onabort = () => reject(transaction.error ?? new Error("本地数据库事务已中断"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("当前浏览器不支持 IndexedDB 本地存储"));

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(LIBRARY_DATABASE_NAME, LIBRARY_DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SUBJECT_STORE)) {
        const subjects = database.createObjectStore(SUBJECT_STORE, { keyPath: "id" });
        subjects.createIndex("sortOrder", "sortOrder", { unique: false });
      }
      if (!database.objectStoreNames.contains(RESOURCE_STORE)) {
        const resources = database.createObjectStore(RESOURCE_STORE, { keyPath: "id" });
        resources.createIndex("subjectId", "subjectId", { unique: false });
        resources.createIndex("fingerprint", "fingerprint", { unique: false });
        resources.createIndex("importedAt", "importedAt", { unique: false });
        resources.createIndex("lastOpenedAt", "lastOpenedAt", { unique: false });
      }
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        database.createObjectStore(FILE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("无法打开本地资料库"));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("本地资料库正在被其他页面占用，请关闭其他标签页后重试"));
    };
  });

  return databasePromise;
}

export async function initializeLocalLibrary(): Promise<void> {
  const database = await openDatabase();
  const readTransaction = database.transaction(META_STORE, "readonly");
  const seeded = await requestToPromise(readTransaction.objectStore(META_STORE).get(SEEDED_KEY) as IDBRequest<MetaRecord | undefined>);
  if (seeded?.value) return;

  const transaction = database.transaction([SUBJECT_STORE, META_STORE], "readwrite");
  const subjectStore = transaction.objectStore(SUBJECT_STORE);
  createDefaultLibrarySubjects().forEach((subject) => subjectStore.put(subject));
  transaction.objectStore(META_STORE).put({ key: SEEDED_KEY, value: true } satisfies MetaRecord);
  await transactionToPromise(transaction);
}

export async function readLibrarySnapshot(): Promise<LibrarySnapshot> {
  const database = await openDatabase();
  const transaction = database.transaction([SUBJECT_STORE, RESOURCE_STORE], "readonly");
  const subjectsPromise = requestToPromise(transaction.objectStore(SUBJECT_STORE).getAll() as IDBRequest<LibrarySubject[]>);
  const resourcesPromise = requestToPromise(transaction.objectStore(RESOURCE_STORE).getAll() as IDBRequest<LocalResource[]>);
  const [subjects, resources] = await Promise.all([subjectsPromise, resourcesPromise]);
  return {
    subjects: subjects.sort((left, right) => left.sortOrder - right.sortOrder),
    resources,
  };
}

export async function putLibrarySubject(subject: LibrarySubject): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SUBJECT_STORE, "readwrite");
  transaction.objectStore(SUBJECT_STORE).put(subject);
  await transactionToPromise(transaction);
}

export async function putLibrarySubjects(subjects: LibrarySubject[]): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SUBJECT_STORE, "readwrite");
  const store = transaction.objectStore(SUBJECT_STORE);
  subjects.forEach((subject) => store.put(subject));
  await transactionToPromise(transaction);
}

export async function removeLibrarySubject(subjectId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([SUBJECT_STORE, RESOURCE_STORE, FILE_STORE], "readwrite");
  const resources = await requestToPromise(
    transaction.objectStore(RESOURCE_STORE).index("subjectId").getAll(subjectId) as IDBRequest<LocalResource[]>,
  );
  transaction.objectStore(SUBJECT_STORE).delete(subjectId);
  resources.forEach((resource) => {
    transaction.objectStore(RESOURCE_STORE).delete(resource.id);
    transaction.objectStore(FILE_STORE).delete(resource.id);
  });
  await transactionToPromise(transaction);
}

export async function writeImportedResources(
  entries: Array<{ resource: LocalResource; file: File }>,
  replacedResourceIds: string[],
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([RESOURCE_STORE, FILE_STORE], "readwrite");
  const resourceStore = transaction.objectStore(RESOURCE_STORE);
  const fileStore = transaction.objectStore(FILE_STORE);

  replacedResourceIds.forEach((resourceId) => {
    resourceStore.delete(resourceId);
    fileStore.delete(resourceId);
  });
  entries.forEach(({ resource, file }) => {
    resourceStore.put(resource);
    fileStore.put({ id: resource.id, blob: file } satisfies StoredResourceFile);
  });

  await transactionToPromise(transaction);
}

export async function putLocalResource(resource: LocalResource): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(RESOURCE_STORE, "readwrite");
  transaction.objectStore(RESOURCE_STORE).put(resource);
  await transactionToPromise(transaction);
}

export async function removeLocalResource(resourceId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([RESOURCE_STORE, FILE_STORE], "readwrite");
  transaction.objectStore(RESOURCE_STORE).delete(resourceId);
  transaction.objectStore(FILE_STORE).delete(resourceId);
  await transactionToPromise(transaction);
}

export async function readResourceBlob(resourceId: string): Promise<Blob | null> {
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readonly");
  const record = await requestToPromise(
    transaction.objectStore(FILE_STORE).get(resourceId) as IDBRequest<StoredResourceFile | undefined>,
  );
  return record?.blob ?? null;
}
