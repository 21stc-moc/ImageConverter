from fastapi.responses import StreamingResponse
import io
import zipfile
import urllib.request

def download(image_url, media_format, prefix, total):
    try:
        zip_buf = io.BytesIO()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for i in range(1, int(total) + 1):
                filename = f"{prefix}{i}.{media_format}"
                url = f"{image_url}/{filename}"

                # Tải dữ liệu ảnh vào RAM
                with urllib.request.urlopen(url) as response:
                    file_data = response.read()

                # Ghi dữ liệu vào ZIP
                zip_file.writestr(filename, file_data)
                print("Downloaded & zipped:", url)

        zip_buf.seek(0)

        print("Return ZIP")

        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={
                "Content-Disposition": 'attachment; filename="download_images.zip"'
            }
        )

    except Exception as e:
        print("ERROR:", e)
        raise
