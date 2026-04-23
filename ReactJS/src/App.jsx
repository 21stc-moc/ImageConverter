import "./App.css";
import { ConfigProvider, Layout, Menu } from "antd";
import { FaCloudArrowDown } from "react-icons/fa6";
import { Outlet, useNavigate } from "react-router";
import ConvertedList from "./pages/converted-list";
import viVN from "antd/es/locale/vi_VN";

const items = [
  {
    key: "/convert-img",
    label: "Chuyển đổi",
  },
  {
    key: "/ocr",
    label: "Ảnh sang chuỗi",
  },
];

function MyPage() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#aa3bff",
          colorLink: "#aa3bff",
          fontFamily: "Roboto, sans-serif",
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            footerBg: "#ffffff",
          },
        },
      }}>
      <div className="App">
        <Layout>
          <Layout.Header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <div className="demo-logo" />
            <Menu
              mode="horizontal"
              items={items}
              onClick={(e) => navigate(e.key)}
              style={{ flex: 1, minWidth: 0, justifyContent: "center" }}
            />
            <ConvertedList />
          </Layout.Header>
          <Layout.Content>
            <Outlet />
          </Layout.Content>
          <Layout.Footer style={{ textAlign: "center" }}>
            Image Converter ©{currentYear} Created by Anh Vo
          </Layout.Footer>
        </Layout>
      </div>
    </ConfigProvider>
  );
}

export default MyPage;
