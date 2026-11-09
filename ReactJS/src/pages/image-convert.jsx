import {
  App,
  Button,
  Empty,
  Flex,
  Grid,
  List,
  Popconfirm,
  Select,
  Tag,
  Typography,
  Upload,
} from "antd";
import { useState } from "react";
import {
  FaFileMedical,
  FaArrowRight,
  FaDownload,
  FaTrash,
  FaFileZipper,
  FaImage,
} from "react-icons/fa6";
import { pythonService } from "../services/pythonService";
import {
  deleteConvertedFile,
  saveConvertedFile,
} from "../store/convertedFilesSlice";
import { useDispatch, useSelector } from "react-redux";
import { downloadConvertedFile, formatBytes } from "../utils/download";

const { useBreakpoint } = Grid;

const fileTypes = [
  {
    format: "ICO",
    type: "image/x-icon",
    extension: ".ico",
  },
  {
    format: "JPEG",
    type: "image/jpeg",
    extension: ".jpeg",
  },
  {
    format: "JPG",
    type: "image/jpg",
    extension: ".jpg",
  },
  {
    format: "PNG",
    type: "image/png",
    extension: ".png",
  },
  {
    format: "WEBP",
    type: "image/webp",
    extension: ".webp",
  },
];

// fallback uuid nếu môi trường không có crypto.randomUUID
const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ImageConvert() {
  const { message } = App.useApp();

  const screens = useBreakpoint();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [convertType, setConvertType] = useState(".png");
  // id các file được chuyển đổi trong lần mở trang này (mới nhất trước)
  const [recentIds, setRecentIds] = useState([]);

  // Lấy từ store để đồng bộ khi file bị xoá ở "Danh sách đã chuyển đổi"
  const convertedItems = useSelector((state) => state.convertedFiles.items);
  const recentItems = recentIds
    .map((id) => convertedItems.find((item) => item.id === id))
    .filter(Boolean);

  const addResult = (item, blob) => {
    dispatch(saveConvertedFile(item, blob));
    setRecentIds((prev) => [item.id, ...prev]);
  };

  const onDownload = (item) => {
    try {
      downloadConvertedFile(item);
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      message.error("Tải file thất bại");
    }
  };

  const onConvert = async () => {
    try {
      setLoading(true);

      const fileInfo = fileTypes.find((item) => item.extension === convertType);
      const formData = new FormData();

      if (fileList.length > 1) {
        fileList.forEach((file) => {
          formData.append("files", file);
        });

        const res = await pythonService.convertMulti(formData, {
          format: fileInfo.format,
        });

        const blob = res.data;
        const url = window.URL.createObjectURL(blob);
        const name = `converted_${Date.now()}.zip`;

        addResult(
          {
            id: genId(),
            name,
            url,
            mimeType: "application/zip",
            size: blob.size,
            originalName: `${fileList.length} tệp`,
            isZip: true,
            createdAt: Date.now(),
          },
          blob,
        );
      } else {
        const file = fileList[0];

        formData.append("file", file);
        const res = await pythonService.convert(formData, {
          format: fileInfo.format,
          type: fileInfo.type,
        });

        const blob = res.data;
        const url = window.URL.createObjectURL(blob);
        const baseName =
          file.name.split(".").slice(0, -1).join(".") || file.name;
        const name = baseName + convertType;

        addResult(
          {
            id: genId(),
            name,
            url,
            mimeType: fileInfo.type,
            size: blob.size,
            originalName: file.name,
            isZip: false,
            createdAt: Date.now(),
          },
          blob,
        );
      }

      message.success("Chuyển đổi thành công");
    } catch (err) {
      console.error(err);
      message.error("Chuyển đổi thất bại");
    } finally {
      setLoading(false);
      setFileList([]);
    }
  };

  const props = {
    multiple: true,
    fileList: fileList,
    listType: "picture",
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload(file, fileList) {
      const acceptType = [
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
      ];

      if (!acceptType.includes(file.type)) {
        message.error(
          "Vui lòng chỉ tải lên tệp .png, .jpg, .jpeg, .webp, svg+xml",
        );
        return Upload.LIST_IGNORE;
      }

      const totalSize = fileList.reduce(
        (acc, curr) => acc + (curr?.size || 0),
        0,
      );

      if (totalSize > 1024 * 1024 * 500) {
        message.error("Tổng kích thước tệp vượt quá 500MB");
        return Upload.LIST_IGNORE;
      }

      Object.defineProperty(file, "name", {
        value: `${Date.now()}_${file.name}`,
        writable: false,
      });

      setFileList(fileList);
      return false;
    },
  };

  return (
    <Flex vertical gap="large">
      <Upload.Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <FaFileMedical size={30} />
        </p>
        <p className="ant-upload-text">
          Nhấp hoặc kéo tệp vào khu vực này để tải lên tệp.
        </p>
        <p className="ant-upload-hint">Kích thước tệp tối đa 500MB</p>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <Flex align="center" justify="space-between" className="convert-action">
          {!screens.xs && (
            <Typography.Text>Đã thêm {fileList.length} tệp</Typography.Text>
          )}
          <Flex
            align="center"
            flex={1}
            justify={screens.xs ? "space-between" : "end"}
            gap="large">
            <Flex align="center" gap="small">
              {!screens.xs && <Typography.Text>Chuyển sang:</Typography.Text>}
              <Select
                value={convertType}
                onChange={(e) => setConvertType(e)}
                style={{ width: 100 }}>
                {fileTypes.map((item, index) => (
                  <Select.Option key={index} value={item.extension}>
                    {item.format}
                  </Select.Option>
                ))}
              </Select>
            </Flex>
            <Button
              type="primary"
              icon={<FaArrowRight />}
              iconPlacement="end"
              size="large"
              loading={loading}
              onClick={onConvert}>
              Chuyển đổi
            </Button>
          </Flex>
        </Flex>
      )}

      {recentItems.length > 0 && (
        <List
          bordered
          header={
            <Flex align="center" justify="space-between">
              <Typography.Text strong>Kết quả chuyển đổi</Typography.Text>
              <Typography.Text type="secondary">
                Đã lưu vào "Danh sách đã chuyển đổi"
              </Typography.Text>
            </Flex>
          }
          dataSource={recentItems}
          style={{ backgroundColor: "#fff" }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="download"
                  type="primary"
                  icon={<FaDownload />}
                  onClick={() => onDownload(item)}>
                  {!screens.xs && "Tải xuống"}
                </Button>,
                <Popconfirm
                  key="remove"
                  title="Xoá khỏi danh sách?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  onConfirm={() => dispatch(deleteConvertedFile(item))}>
                  <Button color="danger" variant="filled" icon={<FaTrash />} />
                </Popconfirm>,
              ]}>
              <List.Item.Meta
                avatar={
                  item.isZip ? (
                    <Flex
                      align="center"
                      justify="center"
                      style={{ width: 56, height: 56 }}>
                      <FaFileZipper size={32} />
                    </Flex>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.name}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "contain",
                        borderRadius: 6,
                        border: "1px solid #f0f0f0",
                        // nền caro để thấy rõ vùng trong suốt
                        background:
                          "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 12px 12px",
                      }}
                    />
                  )
                }
                title={
                  <Flex align="center" gap="small" wrap>
                    <Typography.Text strong ellipsis style={{ maxWidth: 260 }}>
                      {item.name}
                    </Typography.Text>
                    <Tag>{formatBytes(item.size)}</Tag>
                  </Flex>
                }
                description={
                  <Typography.Text type="secondary" ellipsis>
                    Từ: {item.originalName}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Flex>
  );
}

export default ImageConvert;
