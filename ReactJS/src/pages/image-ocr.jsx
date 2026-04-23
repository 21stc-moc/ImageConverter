import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Upload,
} from "antd";
import { useState } from "react";
import { FaArrowsSpin, FaUpload } from "react-icons/fa6";
import { MdClose } from "react-icons/md";
import { pythonService } from "../services/pythonService";

const ACCEPT_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
const MAX_TOTAL_SIZE = 1024 * 1024 * 500;
const MAX_COUNT = 5;

function ImageOCR() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [result, setResult] = useState({
    count: 0,
    lang: "en",
    results: [],
  });
  const [fileList, setFileList] = useState([]);

  const handleRemove = (uid) => {
    setFileList((prev) => {
      const removed = prev.find((f) => f.uid === uid);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.uid !== uid);
    });
  };

  const beforeUpload = (file) => {
    if (!ACCEPT_TYPES.includes(file.type)) {
      message.error("Vui lòng chỉ tải lên tệp .png, .jpg, .jpeg, .webp, .svg");
      return Upload.LIST_IGNORE;
    }

    let rejected = false;
    setFileList((prev) => {
      if (prev.length >= MAX_COUNT) {
        message.warning(`Tối đa ${MAX_COUNT} ảnh`);
        rejected = true;
        return prev;
      }
      const totalSize =
        prev.reduce((acc, f) => acc + (f?.size || 0), 0) + file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        message.error("Tổng kích thước tệp vượt quá 500MB");
        rejected = true;
        return prev;
      }
      file.previewUrl = URL.createObjectURL(file);
      return [...prev, file];
    });

    return rejected ? Upload.LIST_IGNORE : false;
  };

  const onConvert = async () => {
    try {
      setLoading(true);

      const formData = new FormData();

      fileList.forEach((file) => {
        formData.append("files", file);
      });

      const res = await pythonService.ocrProcess(formData, {
        lang: lang,
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      message.error("Chuyển đổi thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row gutter={[40, 12]}>
      <Col xs={24} lg={12} style={{ height: "100%" }}>
        <Card
          title="Đầu vào"
          extra={
            <Upload
              multiple
              showUploadList={false}
              fileList={[]}
              beforeUpload={beforeUpload}>
              <Button icon={<FaUpload />}>
                Tải ảnh lên ({fileList.length}/{MAX_COUNT})
              </Button>
            </Upload>
          }>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fileList.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#aaa",
                  padding: "32px 0",
                  border: "1px dashed #d9d9d9",
                  borderRadius: 8,
                }}>
                Chưa có ảnh nào được tải lên
              </div>
            )}
            {fileList.map((file) => (
              <div
                key={file.uid}
                style={{
                  position: "relative",
                  lineHeight: 0,
                  borderRadius: 6,
                  overflow: "hidden",
                }}>
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  style={{ width: "100%", display: "block" }}
                />
                <button
                  onClick={() => handleRemove(file.uid)}
                  title="Xóa ảnh"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.55)",
                    border: "none",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    padding: 0,
                    lineHeight: 1,
                  }}>
                  <MdClose size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card
          title="Kết quả"
          extra={
            <Flex gap="small">
              <Select
                value={lang}
                onChange={(e) => setLang(e)}
                style={{ width: 150 }}>
                <Select.Option value="vi">Việt</Select.Option>
                <Select.Option value="en">Anh</Select.Option>
                <Select.Option value="ja">Nhật</Select.Option>
                <Select.Option value="ch">Trung (Giản thể)</Select.Option>
                <Select.Option value="ch_tra">Trung (Phồn thể)</Select.Option>
              </Select>
              <Button
                type="primary"
                icon={<FaArrowsSpin />}
                loading={loading}
                disabled={fileList.length === 0}
                onClick={onConvert}>
                Xem
              </Button>
            </Flex>
          }>
          {result.count > 0 ? (
            result.results.map((item, index) => (
              <Input.TextArea key={index} value={item.text} autoSize readOnly />
            ))
          ) : (
            <Empty />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default ImageOCR;
