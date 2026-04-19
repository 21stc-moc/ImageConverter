import { createSlice } from "@reduxjs/toolkit";

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
  },
});

export const { addConvertedFile, removeConvertedFile, clearAll } =
  convertedFilesSlice.actions;

export default convertedFilesSlice.reducer;
