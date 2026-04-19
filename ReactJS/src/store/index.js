import { configureStore } from "@reduxjs/toolkit";
import convertedFilesReducer from "./convertedFilesSlice";

export const store = configureStore({
  reducer: {
    convertedFiles: convertedFilesReducer,
  },
});
