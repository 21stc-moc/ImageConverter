import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "antd";
import { Provider } from "react-redux";
import { HashRouter, Route, Routes } from "react-router";
import { store } from "./store";
import { loadConvertedFiles } from "./store/convertedFilesSlice";
import MyPage from "./App";
import HomePage from "./pages/main";
import ImageConvert from "./pages/image-convert";
import ImageOCR from "./pages/image-ocr";
import ImageBase64 from "./pages/image-base64";

// Khôi phục danh sách file đã chuyển đổi của phiên hiện tại (sau khi F5)
store.dispatch(loadConvertedFiles());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App>
        <HashRouter>
          <Routes>
            <Route path="/" element={<MyPage />}>
              <Route index element={<HomePage />} />
              <Route path="/convert-img" element={<ImageConvert />} />
              <Route path="/ocr" element={<ImageOCR />} />
              <Route path="/base64" element={<ImageBase64 />} />
            </Route>
          </Routes>
        </HashRouter>
      </App>
    </Provider>
  </StrictMode>,
);
