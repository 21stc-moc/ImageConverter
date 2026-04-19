import { App, Button, Flex, Select, Typography, Upload } from "antd";
import { useState } from "react";
import { FaFileMedical, FaArrowRight } from "react-icons/fa6";
import { pythonService } from "../services/pythonService";

const fileTypes = [
  {
    format: "PNG",
    type: "image/png",
    extension: ".png",
  },
  {
    format: "JPG",
    type: "image/jpg",
    extension: ".jpg",
  },
  {
    format: "JPEG",
    type: "image/jpeg",
    extension: ".jpeg",
  },
  {
    format: "WEBP",
    type: "image/webp",
    extension: ".webp",
  },
];

function ImageConvert() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [convertType, setConvertType] = useState(".png");

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

        onDownLoad(url, "converted_images.zip");
      } else {
        const file = fileList[0];

        formData.append("file", file);
        const res = await pythonService.convert(formData, {
          format: fileInfo.format,
          type: fileInfo.type,
        });

        const blob = res.data;
        const url = window.URL.createObjectURL(blob);

        const fileItems = file.name.split(".");
        onDownLoad(url, fileItems[0] + convertType);
      }
    } catch (err) {
      console.error(err);
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

  const onDownLoad = async (url, file) => {
    try {
      setIsSuccess(true);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
    }
  };

  return (
    <Flex vertical>
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
          <Typography.Text>Đã thêm {fileList.length} tệp</Typography.Text>
          <Flex align="center" gap="large">
            <Flex align="center" gap="small">
              Chuyển sang:
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
              onClick={onConvert}>
              Chuyển đổi
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

export default ImageConvert;
