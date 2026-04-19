import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "antd";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router";
import { store } from "./store";
import MyPage from "./App";
import HomePage from "./pages/main";
import ImageConvert from "./pages/image-convert";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MyPage />}>
              <Route index element={<HomePage />} />
              <Route path="/image-converter" element={<ImageConvert />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </App>
    </Provider>
  </StrictMode>,
);
