import { Card, Col, Flex, Row, Space, Typography } from "antd";
import {
  FaCloud,
  FaExpeditedssl,
  FaRegFile,
  FaServer,
  FaShield,
  FaUnlockKeyhole,
} from "react-icons/fa6";

function HomePage() {
  return (
    <Row gutter={[30, 30]}>
      <Col span={8}>
        <Card
          style={{ height: "100%" }}
          title={
            <Flex align="center" gap="small">
              <FaRegFile size={22} />
              <span>Chuyển đổi bất kỳ tệp nào</span>
            </Flex>
          }>
          <p>
            Hỗ trợ chuyển đổi hơn 1500 loại tệp. Bạn có thể chuyển đổi video,
            hình ảnh, tệp âm thanh hoặc sách điện tử. Có rất nhiều tùy chọn nâng
            cao để tinh chỉnh quá trình chuyển đổi của bạn.
          </p>
        </Card>
      </Col>
      <Col span={8}>
        <Card
          title={
            <Flex align="center" gap="small">
              <FaCloud size={22} />
              <span>Hoạt động ở mọi nơi</span>
            </Flex>
          }>
          <p>
            Là một công cụ chuyển đổi tập tin trực tuyến. Vì vậy, nó hoạt động
            trên Windows, Mac, Linux hoặc bất kỳ thiết bị di động nào. Tất cả
            các trình duyệt chính đều được hỗ trợ. Chỉ cần tải lên một tập tin
            và chọn định dạng đích.
          </p>
        </Card>
      </Col>
      <Col span={8}>
        <Card
          style={{ height: "100%" }}
          title={
            <Flex align="center" gap="small">
              <FaShield size={22} />
              <span>Đảm bảo quyền riêng tư</span>
            </Flex>
          }>
          <p>
            Chúng tôi hiểu rằng bảo mật và quyền riêng tư của tập tin rất quan
            trọng đối với bạn. Đó là lý do tại sao chúng tôi sử dụng mã hóa SSL
            256 bit khi truyền tải tập tin và tự động xóa chúng sau khi đóng
            trình duyệt.
          </p>
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Dữ liệu của bạn, Ưu tiên của chúng tôi">
          <Row gutter={40}>
            <Col span={16}>
              <p>
                Chúng tôi không chỉ chuyển đổi tệp—chúng tôi còn bảo vệ chúng.
                Khung bảo mật mạnh mẽ của chúng tôi đảm bảo rằng dữ liệu của bạn
                luôn an toàn, cho dù bạn đang chuyển đổi hình ảnh, video hay tài
                liệu. Với mã hóa nâng cao, trung tâm dữ liệu an toàn và giám sát
                thận trọng, chúng tôi đã bảo vệ mọi khía cạnh về an toàn dữ liệu
                của bạn.
              </p>
            </Col>
            <Col span={8}>
              <Space orientation="vertical" size="middle">
                <Space size="medium">
                  <FaExpeditedssl size={24} />
                  <Typography.Title level={5}>Mã hóa SSL/TLS</Typography.Title>
                </Space>
                <Space size="medium">
                  <FaServer size={24} />
                  <Typography.Title level={5}>
                    Trung tâm dữ liệu được bảo mật
                  </Typography.Title>
                </Space>
                <Space size="medium">
                  <FaUnlockKeyhole size={24} />
                  <Typography.Title level={5}>
                    Kiểm soát truy cập và xác thực
                  </Typography.Title>
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default HomePage;
