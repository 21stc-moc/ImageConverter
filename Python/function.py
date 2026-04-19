from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
from PIL import Image
import io
import zipfile
import resvg_py


def _is_svg(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    return content_type == "image/svg+xml" or filename.endswith(".svg")


def _load_image(file: UploadFile) -> Image.Image:
    """Load an image from an UploadFile, with SVG input support."""
    if _is_svg(file):
        # PIL không đọc được SVG → rasterize sang PNG bằng resvg (Rust binding, không cần Cairo/lxml)
        svg_bytes = file.file.read()
        png_bytes = bytes(resvg_py.svg_to_bytes(svg_string=svg_bytes.decode("utf-8")))
        return Image.open(io.BytesIO(png_bytes)).convert("RGBA")

    return Image.open(file.file).convert("RGBA")


ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def _save_image(image: Image.Image, buf: io.BytesIO, media_format: str) -> None:
    """Save a PIL image to buf. Handles ICO's size limit và JPG không hỗ trợ alpha."""
    fmt = media_format.upper()

    # Chuẩn hoá tên format JPG -> JPEG cho Pillow
    if fmt == "JPG":
        fmt = "JPEG"

    if fmt == "ICO":
        # ICO giới hạn ≤ 256×256; chỉ lấy các size ≤ cạnh dài của ảnh gốc
        max_side = max(image.size)
        sizes = [s for s in ICO_SIZES if s[0] <= max_side] or [(min(max_side, 256), min(max_side, 256))]
        image.save(buf, format="ICO", sizes=sizes)
        return

    if fmt in ("JPEG", "BMP"):
        # JPG/BMP không hỗ trợ alpha → flatten lên nền trắng
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            background = Image.new("RGB", image.size, (255, 255, 255))
            rgba = image.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])  # dùng alpha làm mask
            image = background
        else:
            image = image.convert("RGB")
        image.save(buf, format=fmt, quality=95)
        return

    image.save(buf, format=fmt)


def convert(media_format, media_type, file: UploadFile = File(...)):
    try:
        image = _load_image(file)

        buf = io.BytesIO()
        _save_image(image, buf, media_format)
        buf.seek(0)

        return StreamingResponse(
            buf,
            media_type=media_type
        )
    except Exception as e:
        print("ERROR:", e)
        raise

def convert_multi(media_format, files: list[UploadFile] = File(...)):
    try:
        print("Start convert:", [f.filename for f in files])

        zip_buf = io.BytesIO()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for file in files:
                print("Processing:", file.filename)

                image = _load_image(file)

                img_buf = io.BytesIO()
                _save_image(image, img_buf, media_format)
                img_buf.seek(0)

                output_name = f"{file.filename.rsplit('.', 1)[0]}.{media_format.lower()}"
                zip_file.writestr(output_name, img_buf.read())

        zip_buf.seek(0)

        print("Return ZIP")

        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={
                "Content-Disposition": 'attachment; filename="converted_images.zip"'
            }
        )

    except Exception as e:
        print("ERROR:", e)
        raise