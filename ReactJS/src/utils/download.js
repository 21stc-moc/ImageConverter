/** Tải một file đã chuyển đổi (dùng object URL có sẵn trong store). */
export const downloadConvertedFile = (item) => {
  const link = document.createElement("a");
  link.href = item.url;
  link.setAttribute("download", item.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // KHÔNG revoke URL ở đây — để user còn tải lại lần sau
};

export const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};
