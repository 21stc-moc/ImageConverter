import {
  App,
  Badge,
  Button,
  Dropdown,
  Flex,
  List,
  Popconfirm,
  Tag,
  Typography,
} from "antd";
import {
  FaCloudArrowDown,
  FaDownload,
  FaFileZipper,
  FaImage,
  FaTrash,
} from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { clearAll, removeConvertedFile } from "../store/convertedFilesSlice";

function ConvertedList() {
  const { message } = App.useApp();
  const convertedItems = useSelector((state) => state.convertedFiles.items);

  const dispatch = useDispatch();

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const onDownload = (item) => {
    try {
      const link = document.createElement("a");
      link.href = item.url;
      link.setAttribute("download", item.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // KHÔNG revoke URL ở đây — để user còn tải lại lần sau
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      message.error("Tải file thất bại");
    }
  };

  const onRemoveItem = (item) => {
    // Giải phóng object URL trước khi remove khỏi store để tránh memory leak
    try {
      window.URL.revokeObjectURL(item.url);
    } catch (e) {
      console.error(e);
    }
    dispatch(removeConvertedFile(item.id));
  };

  const onClearAll = () => {
    convertedItems.forEach((item) => {
      try {
        window.URL.revokeObjectURL(item.url);
      } catch (e) {
        console.error(e);
      }
    });
    dispatch(clearAll());
  };

  return (
    <Dropdown
      trigger={["click"]}
      popupRender={() => (
        <List
          bordered
          dataSource={convertedItems}
          itemLayout="vertical"
          header={
            <Flex align="center" justify="space-between">
              <Typography.Title level={5} style={{ margin: 0 }}>
                Danh sách đã chuyển đổi
              </Typography.Title>
              {convertedItems.length > 0 && (
                <Popconfirm
                  title="Xoá tất cả?"
                  description="Toàn bộ file đã chuyển đổi sẽ bị xoá khỏi danh sách."
                  okText="Xoá"
                  cancelText="Huỷ"
                  onConfirm={onClearAll}>
                  <Button danger type="dashed" icon={<FaTrash />} />
                </Popconfirm>
              )}
            </Flex>
          }
          style={{ backgroundColor: "#fff", minWidth: 400 }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Typography.Text type="secondary">
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Typography.Text>,
                <Button
                  key="download"
                  color="primary"
                  variant="filled"
                  icon={<FaDownload />}
                  onClick={() => onDownload(item)}>
                  Tải xuống
                </Button>,
                <Popconfirm
                  key="remove"
                  title="Xoá khỏi danh sách?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  onConfirm={() => onRemoveItem(item)}>
                  <Button color="danger" variant="filled" icon={<FaTrash />} />
                </Popconfirm>,
              ]}>
              <List.Item.Meta
                avatar={
                  item.isZip ? (
                    <FaFileZipper size={28} />
                  ) : (
                    <FaImage size={28} />
                  )
                }
                title={
                  <Flex align="center" gap="small">
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Tag>{formatBytes(item.size)}</Tag>
                  </Flex>
                }
                description={
                  <Typography.Text type="secondary">
                    Từ: {item.originalName}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}>
      <Badge count={convertedItems.length} overflowCount={10}>
        <Button
          color="primary"
          variant="outlined"
          icon={<FaCloudArrowDown />}
        />
      </Badge>
    </Dropdown>
  );
}

export default ConvertedList;
