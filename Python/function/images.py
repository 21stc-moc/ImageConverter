from fastapi import UploadFile, File, HTTPException
from module.ocr_module import OCRModule
from fastapi.responses import StreamingResponse
from PIL import Image
import io
import zipfile
import resvg_py


# Khởi tạo 1 lần, tái sử dụng nhiều lần (engine được cache).
# prefer_paddle_for_cjk=False → dùng EasyOCR cho cả 4 ngôn ngữ (vi/en/ja/ch/ch_tra).
# Không cần PaddleOCR/PaddlePaddle → venv gọn, không dính lỗi mypyc.
ocr = OCRModule(use_gpu=False, prefer_paddle_for_cjk=False)


def _svg_bytes_to_png_bytes(svg_bytes: bytes) -> bytes:
    """Rasterize SVG bytes → PNG bytes (dùng chung cho convert và OCR)."""
    return bytes(resvg_py.svg_to_bytes(svg_string=svg_bytes.decode("utf-8")))


def _is_svg(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    return content_type == "image/svg+xml" or filename.endswith(".svg")


def _load_image(file: UploadFile) -> Image.Image:
    """Load an image from an UploadFile, with SVG input support."""
    if _is_svg(file):
        # PIL không đọc được SVG → rasterize sang PNG bằng resvg (Rust binding, không cần Cairo/lxml)
        svg_bytes = file.file.read()
        png_bytes = _svg_bytes_to_png_bytes(svg_bytes)
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


def ocr_multi(lang: str, files: list[UploadFile] = File(...)):
    """
    Nhận diện văn bản từ tối đa 5 ảnh cùng lúc.
    Tham số:
        lang  : một trong {vi, en, ja, ch, ch_tra}
        files : list UploadFile (tối đa 5)
    Trả về:
        {
            "lang": "...",
            "count": N,
            "results": [
                {"filename": "...", "text": "...", "error": None | "..."},
                ...
            ]
        }
    """
    # Validate ngôn ngữ sớm để trả lỗi HTTP rõ ràng
    if lang not in OCRModule.SUPPORTED_LANGS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ngôn ngữ '{lang}' không hỗ trợ. "
                f"Các lựa chọn: {list(OCRModule.SUPPORTED_LANGS)}"
            ),
        )

    if not files:
        raise HTTPException(status_code=400, detail="Chưa có file nào được gửi lên.")

    if len(files) > OCRModule.MAX_IMAGES:
        raise HTTPException(
            status_code=413,
            detail=f"Tối đa {OCRModule.MAX_IMAGES} ảnh mỗi lần (nhận được {len(files)}).",
        )

    # Đọc bytes từng file, SVG thì rasterize trước
    items: list[tuple[str, bytes]] = []
    for f in files:
        try:
            raw = f.file.read()
            if _is_svg(f):
                raw = _svg_bytes_to_png_bytes(raw)
            items.append((f.filename or "unknown", raw))
        except Exception as e:
            # Ghi nhận lỗi đọc file nhưng vẫn tiếp tục các file còn lại
            print(f"READ ERROR {f.filename}: {e}")
            items.append((f.filename or "unknown", b""))

    try:
        results = ocr.recognize_batch_bytes(items, lang=lang)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("OCR ERROR:", e)
        raise HTTPException(status_code=500, detail=f"OCR thất bại: {e}")

    return {
        "lang": lang,
        "count": len(results),
        "results": results,
    }


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
