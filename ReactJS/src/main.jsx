import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "antd";
import MyPage from "./App";
import { BrowserRouter, Route, Routes } from "react-router";
import ImageConvert from "./pages/image-convert";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App>
      <BrowserRouter>
        <Routes>
          <Route element={<MyPage />}>
            <Route path="/" element={<ImageConvert />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </App>
  </StrictMode>,
);
