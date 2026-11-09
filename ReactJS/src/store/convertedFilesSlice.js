import { createSlice } from "@reduxjs/toolkit";
import {
  cleanupStaleFiles,
  clearSessionFiles,
  deleteFile,
  loadSessionFiles,
  saveFile,
} from "./convertedFilesDB";

/**
 * Mỗi item trong items có dạng:
 * {
 *   id: string,           // uuid tạo ở client
 *   name: string,         // tên file output (vd: photo.png, converted_images.zip)
 *   url: string,          // object URL tạo từ blob (serializable)
 *   mimeType: string,     // vd: image/png, application/zip
 *   size: number,         // byte
 *   originalName: string, // tên file gốc người dùng upload (hoặc "nhiều tệp")
 *   isZip: boolean,       // true nếu kết quả từ convertMulti
 *   createdAt: number,    // Date.now()
 * }
 *
 * Blob gốc được lưu trong IndexedDB (xem convertedFilesDB.js) để khôi phục
 * lịch sử khi tải lại trang trong cùng phiên; store chỉ giữ object URL.
 */
const convertedFilesSlice = createSlice({
  name: "convertedFiles",
  initialState: {
    items: [],
  },
  reducers: {
    addConvertedFile(state, action) {
      state.items.unshift(action.payload);
    },
    removeConvertedFile(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearAll(state) {
      state.items = [];
    },
    setConvertedFiles(state, action) {
      state.items = action.payload;
    },
  },
});

export const {
  addConvertedFile,
  removeConvertedFile,
  clearAll,
  setConvertedFiles,
} = convertedFilesSlice.actions;

const revoke = (url) => {
  try {
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
  }
};

/** Khôi phục lịch sử của phiên hiện tại từ IndexedDB (gọi 1 lần khi mở app). */
export const loadConvertedFiles = () => async (dispatch, getState) => {
  try {
    await cleanupStaleFiles().catch((e) => console.warn(e));
    const records = await loadSessionFiles();
    const existingIds = new Set(
      getState().convertedFiles.items.map((i) => i.id),
    );
    const restored = records
      .filter((r) => !existingIds.has(r.id))
      .map((record) => {
        const { blob, ...meta } = record;
        delete meta.sessionId;
        return { ...meta, url: window.URL.createObjectURL(blob) };
      });
    if (restored.length) {
      const merged = [...getState().convertedFiles.items, ...restored].sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      dispatch(setConvertedFiles(merged));
    }
  } catch (e) {
    console.warn("Không khôi phục được lịch sử chuyển đổi:", e);
  }
};

/** Thêm file vừa chuyển đổi vào danh sách + lưu blob vào IndexedDB. */
export const saveConvertedFile = (item, blob) => async (dispatch) => {
  dispatch(addConvertedFile(item));
  try {
    const { url: _url, ...meta } = item;
    await saveFile(meta, blob);
  } catch (e) {
    console.warn("Không lưu được file vào phiên:", e);
  }
};

export const deleteConvertedFile = (item) => async (dispatch) => {
  revoke(item.url);
  dispatch(removeConvertedFile(item.id));
  try {
    await deleteFile(item.id);
  } catch (e) {
    console.warn(e);
  }
};

export const clearConvertedFiles = () => async (dispatch, getState) => {
  getState().convertedFiles.items.forEach((item) => revoke(item.url));
  dispatch(clearAll());
  try {
    await clearSessionFiles();
  } catch (e) {
    console.warn(e);
  }
};

export default convertedFilesSlice.reducer;
