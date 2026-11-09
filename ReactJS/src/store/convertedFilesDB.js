/**
 * Lưu file đã chuyển đổi vào IndexedDB để giữ lại qua các lần tải lại trang
 * trong cùng một phiên làm việc (một tab trình duyệt).
 *
 * - Mỗi tab có một sessionId lưu trong sessionStorage (giữ nguyên khi F5,
 *   mất khi đóng tab) → mỗi bản ghi gắn với sessionId của tab tạo ra nó.
 * - Bản ghi của các phiên cũ (tab đã đóng) quá STALE_MS sẽ bị dọn khi mở app.
 * - Nếu IndexedDB không khả dụng (vd: chế độ riêng tư bị chặn) thì mọi hàm
 *   đều "no-op", app vẫn chạy bình thường với lịch sử chỉ nằm trong RAM.
 */

const DB_NAME = "image-converter";
const DB_VERSION = 1;
const STORE = "convertedFiles";
const SESSION_KEY = "convertedFilesSessionId";
const STALE_MS = 24 * 60 * 60 * 1000; // 1 ngày

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let memorySessionId = null;

export const getSessionId = () => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = genId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    memorySessionId ??= genId();
    return memorySessionId;
  }
};

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB không khả dụng"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("sessionId", "sessionId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // Cho phép thử lại lần sau nếu mở thất bại
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
};

const run = async (mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

/** Lưu metadata + blob của một file. */
export const saveFile = (item, blob) =>
  run("readwrite", (store) =>
    store.put({ ...item, blob, sessionId: getSessionId() }),
  );

/** Lấy toàn bộ file của phiên hiện tại (mới nhất trước). */
export const loadSessionFiles = async () => {
  const records = await run("readonly", (store) =>
    store.index("sessionId").getAll(getSessionId()),
  );
  return (records || []).sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteFile = (id) =>
  run("readwrite", (store) => store.delete(id));

/** Xoá toàn bộ file của phiên hiện tại. */
export const clearSessionFiles = async () => {
  const sessionId = getSessionId();
  await run("readwrite", (store) => {
    const req = store.index("sessionId").openKeyCursor(sessionId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  });
};

/** Dọn file của các phiên khác đã cũ (tab đã đóng từ lâu). */
export const cleanupStaleFiles = async () => {
  const sessionId = getSessionId();
  const threshold = Date.now() - STALE_MS;
  await run("readwrite", (store) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const { sessionId: sid, createdAt } = cursor.value;
      if (sid !== sessionId && createdAt < threshold) cursor.delete();
      cursor.continue();
    };
  });
};
