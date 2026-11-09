import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Switch,
  Typography,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import { FaCopy, FaUpload } from "react-icons/fa6";
import { MdClose } from "react-icons/md";

const ACCEPT_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
];
const MAX_SIZE = 1024 * 1024 * 20; // 20MB

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function ImageBase64() {
  const { message } = App.useApp();

  const [file, setFile] = useState(null);
  const [dataUrl, setDataUrl] = useState("");
  const [withPrefix, setWithPrefix] = useState(true);

  // Thu hồi URL preview khi đổi ảnh / rời trang
  useEffect(() => {
    return () => {
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    };
  }, [file]);

  const beforeUpload = async (newFile) => {
    if (!ACCEPT_TYPES.includes(newFile.type)) {
      message.error(
        "Vui lòng chỉ tải lên tệp .png, .jpg, .jpeg, .webp, .gif, .bmp, .ico, .svg",
      );
      return Upload.LIST_IGNORE;
    }
    if (newFile.size > MAX_SIZE) {
      message.error(`Kích thước tệp vượt quá ${formatSize(MAX_SIZE)}`);
      return Upload.LIST_IGNORE;
    }

    try {
      const result = await readAsDataURL(newFile);
      newFile.previewUrl = URL.createObjectURL(newFile);
      setFile(newFile); // chỉ giữ 1 ảnh, ảnh mới thay thế ảnh cũ
      setDataUrl(result);
    } catch (err) {
      console.error(err);
      message.error("Không đọc được tệp ảnh");
    }

    return false;
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    setFile(null);
    setDataUrl("");
  };

  // Cấu hình chung cho nút tải lên và vùng kéo thả (chỉ 1 ảnh mỗi lần)
  const uploadProps = {
    accept: ACCEPT_TYPES.join(","),
    multiple: false,
    maxCount: 1,
    showUploadList: false,
    fileList: [],
    beforeUpload,
  };

  const output = withPrefix ? dataUrl : dataUrl.split(",")[1] || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      message.success("Đã sao chép chuỗi base64");
    } catch (err) {
      console.error(err);
      message.error("Sao chép thất bại");
    }
  };

  return (
    <Row gutter={[40, 12]}>
      <Col xs={24} lg={12}>
        <Card
          title="Đầu vào"
          extra={
            <Upload {...uploadProps}>
              <Button icon={<FaUpload />}>
                {file ? "Chọn ảnh khác" : "Tải ảnh lên"}
              </Button>
            </Upload>
          }
        >
          {file ? (
            <Flex vertical gap={8}>
              {/* Thả ảnh mới vào khung xem trước để thay thế (không mở hộp chọn tệp khi click) */}
              <Upload.Dragger
                {...uploadProps}
                openFileDialogOnClick={false}
                style={{ padding: 0, border: "none", background: "none" }}
              >
                <div
                  style={{
                    position: "relative",
                    lineHeight: 0,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    style={{ width: "100%", display: "block" }}
                  />
                  <button
                    onClick={handleRemove}
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
                    }}
                  >
                    <MdClose size={15} />
                  </button>
                </div>
              </Upload.Dragger>
              <Typography.Text type="secondary">
                {file.name} · {file.type} · {formatSize(file.size)}
              </Typography.Text>
            </Flex>
          ) : (
            <Upload.Dragger {...uploadProps}>
              <Flex
                vertical
                align="center"
                gap={8}
                style={{ padding: "24px 0", color: "#888" }}
              >
                <FaUpload size={32} color="#aa3bff" />
                <Typography.Text strong>
                  Kéo thả ảnh vào đây hoặc bấm để chọn ảnh
                </Typography.Text>
                <Typography.Text type="secondary">
                  Mỗi lần chỉ 1 ảnh · .png, .jpg, .webp, .gif, .bmp, .ico, .svg
                  · tối đa {formatSize(MAX_SIZE)}
                </Typography.Text>
              </Flex>
            </Upload.Dragger>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card
          title="Kết quả"
          extra={
            <Flex gap="small" align="center">
              <Switch
                checked={withPrefix}
                onChange={setWithPrefix}
                checkedChildren="Có data URI"
                unCheckedChildren="Chỉ base64"
              />
              <Button
                type="primary"
                icon={<FaCopy />}
                disabled={!output}
                onClick={handleCopy}
              >
                Sao chép
              </Button>
            </Flex>
          }
        >
          {output ? (
            <Flex vertical gap={8}>
              <Input.TextArea
                value={output}
                readOnly
                autoSize={{ minRows: 6, maxRows: 20 }}
                style={{ fontFamily: "monospace", wordBreak: "break-all" }}
              />
              <Typography.Text type="secondary">
                Độ dài: {output.length.toLocaleString("vi-VN")} ký tự (
                {formatSize(output.length)})
              </Typography.Text>
            </Flex>
          ) : (
            <Empty />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default ImageBase64;
