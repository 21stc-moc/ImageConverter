import "./App.css";
import { ConfigProvider, Layout, Menu } from "antd";
import { Outlet } from "react-router";

const items = [
  {
    key: "1",
    label: "Chuyển đổi định dạng",
  },
  {
    key: "2",
    label: "Ảnh sang chuỗi",
  },
];

function MyPage() {
  const currentYear = new Date().getFullYear();

  return (
    <ConfigProvider
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
            }}>
            <div className="demo-logo" />
            <Menu
              mode="horizontal"
              defaultSelectedKeys={["1"]}
              items={items}
              style={{ flex: 1, minWidth: 0, justifyContent: "center" }}
            />
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
