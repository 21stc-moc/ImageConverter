import {
  App,
  Badge,
  Button,
  Dropdown,
  Flex,
  List,
  Modal,
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
import {
  clearConvertedFiles,
  deleteConvertedFile,
} from "../store/convertedFilesSlice";
import { downloadConvertedFile, formatBytes } from "../utils/download";
import { useState } from "react";

function ConvertedList() {
  const { message } = App.useApp();
  const convertedItems = useSelector((state) => state.convertedFiles.items);

  const dispatch = useDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const onDownload = (item) => {
    try {
      downloadConvertedFile(item);
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      message.error("Tải file thất bại");
    }
  };

  // Thunk tự giải phóng object URL và xoá blob khỏi IndexedDB
  const onRemoveItem = (item) => dispatch(deleteConvertedFile(item));

  const onClearAll = () => dispatch(clearConvertedFiles());

  return (
    <>
      <Badge count={convertedItems.length} overflowCount={10}>
        <Button
          color="primary"
          variant="outlined"
          icon={<FaCloudArrowDown />}
          onClick={() => setIsModalOpen(true)}
        />
      </Badge>
      <Modal
        open={isModalOpen}
        title="Danh sách đã chuyển đổi"
        onCancel={() => setIsModalOpen(false)}
        footer={() => (
          <Popconfirm
            title="Xoá tất cả?"
            description="Toàn bộ file đã chuyển đổi sẽ bị xoá khỏi danh sách."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={onClearAll}>
            <Button
              danger
              type="dashed"
              icon={<FaTrash />}
              disabled={convertedItems.length == 0}
            />
          </Popconfirm>
        )}>
        <List
          bordered
          dataSource={convertedItems}
          itemLayout="vertical"
          style={{ backgroundColor: "#fff", minWidth: 400 }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Typography.Text key="time" type="secondary">
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
      </Modal>
    </>
  );
}

export default ConvertedList;
