"""
ocr_module.py
-------------
Reusable OCR module for typed text in 4 languages:
    - vi      : Tiếng Việt
    - en      : English
    - ja      : 日本語 (Japanese)
    - ch      : 简体中文 (Simplified Chinese)
    - ch_tra  : 繁體中文 (Traditional Chinese)

Engine (100% free, no API keys):
    - EasyOCR (mặc định)  → xử lý cả 4 ngôn ngữ. Không cần PaddleOCR.
    - PaddleOCR (optional) → có thể bật lại cho CJK nếu cần accuracy cao hơn,
      bằng cách: OCRModule(prefer_paddle_for_cjk=True) và cài thêm
      `paddleocr` + `paddlepaddle`. Mặc định TẮT để tránh lỗi mypyc và
      giảm dung lượng venv.

Public API:
    - recognize(path, lang)                 → str      (đọc file từ disk)
    - recognize_batch(paths, lang)          → dict     (batch, tối đa 5 ảnh)
    - recognize_bytes(data, lang)           → str      (dùng cho FastAPI upload)
    - recognize_batch_bytes(items, lang)    → list     (batch bytes, tối đa 5 ảnh)

Install requirements:
    pip install -r requirements.txt
"""

from __future__ import annotations

import io
import warnings
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple, Union

# ---------------------------------------------------------------------- #
# Im lặng các UserWarning không gây ảnh hưởng khi chạy CPU-only:
#   - torch: "'pin_memory' argument is set as true but no accelerator..."
#   - paddle: một số cảnh báo về use_gpu deprecated
# Các cảnh báo này không ảnh hưởng kết quả OCR.
# ---------------------------------------------------------------------- #
warnings.filterwarnings(
    "ignore",
    message=r".*pin_memory.*no accelerator.*",
    category=UserWarning,
)
warnings.filterwarnings("ignore", category=UserWarning, module=r"torch\..*")

SUPPORTED_LANGS = ("vi", "en", "ja", "ch", "ch_tra")
MAX_IMAGES = 5

# Which engine to prefer for each language
_PADDLE_LANGS = {"ja", "ch", "ch_tra"}
_EASY_LANGS = {"vi", "en"}

# Map our codes to EasyOCR language codes
_EASY_CODE = {
    "vi": "vi",
    "en": "en",
    "ja": "ja",
    "ch": "ch_sim",
    "ch_tra": "ch_tra",
}

# Map our codes to PaddleOCR language codes
_PADDLE_CODE = {
    "vi": "vi",
    "en": "en",
    "ja": "japan",
    "ch": "ch",
    "ch_tra": "chinese_cht",
}


class OCRModule:
    """
    Orchestrates EasyOCR + PaddleOCR to recognize typed text in
    Vietnamese, English, Japanese and Chinese.

    Engines are loaded lazily (first time a language is used) and
    cached for re-use, so repeated calls stay fast.
    """

    MAX_IMAGES = MAX_IMAGES
    SUPPORTED_LANGS = SUPPORTED_LANGS

    def __init__(self, use_gpu: bool = False, prefer_paddle_for_cjk: bool = False) -> None:
        """
        Tham số:
            use_gpu                : True nếu máy có GPU NVIDIA + CUDA.
            prefer_paddle_for_cjk  : Mặc định False → EasyOCR xử lý tất cả.
                                     Đặt True nếu bạn đã cài paddleocr/paddlepaddle
                                     và muốn dùng Paddle cho ja/ch/ch_tra.
        """
        self.use_gpu = use_gpu
        self.prefer_paddle_for_cjk = prefer_paddle_for_cjk
        self._easy_cache: dict = {}
        self._paddle_cache: dict = {}

    # ------------------------------------------------------------------ #
    # Lazy engine loaders
    # ------------------------------------------------------------------ #
    def _get_easyocr(self, lang: str):
        if lang not in self._easy_cache:
            import easyocr  # type: ignore

            code = _EASY_CODE[lang]
            # Always pair with English so numbers / Latin words are caught.
            langs = [code] if code == "en" else [code, "en"]
            self._easy_cache[lang] = easyocr.Reader(
                langs, gpu=self.use_gpu, verbose=False
            )
        return self._easy_cache[lang]

    def _get_paddleocr(self, lang: str):
        """
        Khởi tạo PaddleOCR, hỗ trợ cả API cũ (2.x) lẫn mới (3.x).
        3.x bỏ use_gpu/show_log, đổi tên use_angle_cls → use_textline_orientation.
        """
        if lang not in self._paddle_cache:
            from paddleocr import PaddleOCR  # type: ignore

            paddle_lang = _PADDLE_CODE[lang]
            # Thử các bộ kwargs theo thứ tự: mới nhất → cũ
            attempts = [
                # 3.x
                {"use_textline_orientation": True, "lang": paddle_lang},
                # 2.7 – 2.9
                {"use_angle_cls": True, "lang": paddle_lang, "show_log": False},
                # 2.6 trở xuống
                {
                    "use_angle_cls": True,
                    "lang": paddle_lang,
                    "use_gpu": self.use_gpu,
                    "show_log": False,
                },
            ]
            last_err: Exception | None = None
            for kwargs in attempts:
                try:
                    self._paddle_cache[lang] = PaddleOCR(**kwargs)
                    break
                except TypeError as exc:
                    last_err = exc
                    continue
            else:
                raise RuntimeError(
                    f"Không khởi tạo được PaddleOCR: {last_err}"
                )
        return self._paddle_cache[lang]

    # ------------------------------------------------------------------ #
    # Engine runners — chấp nhận cả path (str) lẫn numpy array
    # EasyOCR.readtext()       hỗ trợ path/bytes/np.ndarray (RGB)
    # PaddleOCR.ocr()/predict() hỗ trợ path/np.ndarray (BGR)
    # ------------------------------------------------------------------ #
    def _run_easyocr(self, image: Any, lang: str) -> str:
        reader = self._get_easyocr(lang)
        lines = reader.readtext(image, detail=0, paragraph=True)
        return "\n".join(lines)

    @staticmethod
    def _rgb_to_bgr(image: Any) -> Any:
        """Convert RGB numpy array → BGR cho PaddleOCR. Path/str được giữ nguyên."""
        try:
            import numpy as np  # type: ignore

            if isinstance(image, np.ndarray) and image.ndim == 3 and image.shape[2] == 3:
                return image[:, :, ::-1].copy()
        except Exception:
            pass
        return image

    @staticmethod
    def _parse_paddle_result(result: Any) -> List[str]:
        """
        Parse output của PaddleOCR linh hoạt theo nhiều format:
          - 2.x: [[[box, (text, conf)], ...]]        ← kết quả 1 ảnh gói trong list ngoài
          - 3.x: [{"rec_texts": [...], "rec_scores": [...]}]
          - Biến thể khác (list rỗng, None, dict trực tiếp)
        """
        lines: List[str] = []
        if not result:
            return lines

        # Chuẩn hoá: luôn lặp qua từng "page"
        pages = result if isinstance(result, list) else [result]
        for page in pages:
            if page is None:
                continue

            # 3.x: dict với key rec_texts
            if isinstance(page, dict):
                texts = page.get("rec_texts") or []
                for t in texts:
                    if isinstance(t, str):
                        lines.append(t)
                continue

            # 2.x: list các [box, (text, conf)]
            if isinstance(page, list):
                for item in page:
                    if not item:
                        continue
                    if isinstance(item, (list, tuple)) and len(item) >= 2:
                        content = item[1]
                        if isinstance(content, (list, tuple)) and content:
                            lines.append(str(content[0]))
                        elif isinstance(content, str):
                            lines.append(content)
        return lines

    def _run_paddleocr(self, image: Any, lang: str) -> str:
        ocr = self._get_paddleocr(lang)
        img = self._rgb_to_bgr(image)

        # Thử các chữ ký theo thứ tự từ mới → cũ
        result: Any = None
        errors: List[str] = []
        call_attempts = [
            ("predict", {}),
            ("ocr", {"cls": True}),
            ("ocr", {}),
        ]
        for method_name, kwargs in call_attempts:
            method = getattr(ocr, method_name, None)
            if method is None:
                continue
            try:
                result = method(img, **kwargs) if kwargs else method(img)
                break
            except TypeError as exc:
                errors.append(f"{method_name}({kwargs}): {exc}")
                continue

        if result is None and errors:
            raise RuntimeError("PaddleOCR call failed: " + " | ".join(errors))

        return "\n".join(self._parse_paddle_result(result))

    def _dispatch(self, image: Any, lang: str) -> str:
        """
        Chọn engine theo ngôn ngữ, có:
          - Fallback khi thiếu thư viện (ImportError)
          - Fallback khi engine chính trả text rỗng (cho CJK)
        """
        if lang not in SUPPORTED_LANGS:
            raise ValueError(
                f"Ngôn ngữ '{lang}' không được hỗ trợ. "
                f"Các lựa chọn: {SUPPORTED_LANGS}"
            )
        use_paddle = self.prefer_paddle_for_cjk and lang in _PADDLE_LANGS

        try:
            if use_paddle:
                text = self._run_paddleocr(image, lang)
                # Paddle trả rỗng → thử EasyOCR (nó cũng hỗ trợ ja/ch_sim/ch_tra)
                if not text.strip():
                    try:
                        easy_text = self._run_easyocr(image, lang)
                        if easy_text.strip():
                            return easy_text
                    except Exception:  # noqa: BLE001
                        pass
                return text
            return self._run_easyocr(image, lang)
        except ImportError:
            # Thiếu engine ưu tiên → dùng engine còn lại
            if use_paddle:
                return self._run_easyocr(image, lang)
            return self._run_paddleocr(image, lang)

    # ------------------------------------------------------------------ #
    # Helpers: bytes → numpy array (dùng cho FastAPI upload)
    # ------------------------------------------------------------------ #
    @staticmethod
    def _bytes_to_array(data: bytes):
        """Decode ảnh (bytes) → numpy array RGB để feed vào engine."""
        import numpy as np  # type: ignore
        from PIL import Image  # type: ignore

        if not data:
            raise ValueError("Dữ liệu ảnh trống.")
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
        return np.array(img)

    # ------------------------------------------------------------------ #
    # Public API — PATH
    # ------------------------------------------------------------------ #
    def recognize(self, image_path: Union[str, Path], lang: str = "en") -> str:
        """Run OCR on a single image file on disk."""
        path = str(image_path)
        if not Path(path).exists():
            raise FileNotFoundError(f"Không tìm thấy file: {path}")
        return self._dispatch(path, lang)

    def recognize_batch(
        self,
        image_paths: List[Union[str, Path]],
        lang: str = "en",
    ) -> Dict[str, str]:
        """Batch OCR từ danh sách path (tối đa MAX_IMAGES)."""
        if len(image_paths) == 0:
            raise ValueError("Danh sách ảnh trống.")
        if len(image_paths) > MAX_IMAGES:
            raise ValueError(
                f"Tối đa {MAX_IMAGES} ảnh mỗi lần gọi "
                f"(bạn truyền vào {len(image_paths)})."
            )

        results: Dict[str, str] = {}
        for p in image_paths:
            key = str(p)
            try:
                results[key] = self.recognize(p, lang=lang)
            except Exception as exc:  # noqa: BLE001
                results[key] = f"[ERROR] {exc}"
        return results

    # ------------------------------------------------------------------ #
    # Public API — BYTES (dùng cho FastAPI UploadFile)
    # ------------------------------------------------------------------ #
    def recognize_bytes(self, data: bytes, lang: str = "en") -> str:
        """
        Run OCR on an image passed as raw bytes.
        Ideal for FastAPI: file.file.read() → recognize_bytes(data, lang).
        """
        arr = self._bytes_to_array(data)
        return self._dispatch(arr, lang)

    def recognize_batch_bytes(
        self,
        items: Iterable[Tuple[str, bytes]],
        lang: str = "en",
    ) -> List[Dict[str, Any]]:
        """
        Batch OCR cho danh sách (name, bytes). Tối đa MAX_IMAGES phần tử.

        Trả về list các dict:
            {"filename": str, "text": str, "error": Optional[str]}
        Lỗi ở một ảnh không làm hỏng cả batch.
        """
        items = list(items)
        if not items:
            raise ValueError("Danh sách ảnh trống.")
        if len(items) > MAX_IMAGES:
            raise ValueError(
                f"Tối đa {MAX_IMAGES} ảnh mỗi lần gọi "
                f"(bạn truyền vào {len(items)})."
            )

        out: List[Dict[str, Any]] = []
        for name, data in items:
            try:
                text = self.recognize_bytes(data, lang=lang)
                out.append({"filename": name, "text": text, "error": None})
            except Exception as exc:  # noqa: BLE001
                out.append({"filename": name, "text": "", "error": str(exc)})
        return out

    # ------------------------------------------------------------------ #
    # Pretty printing (CLI)
    # ------------------------------------------------------------------ #
    @staticmethod
    def print_results(results: Dict[str, str]) -> None:
        """Print batch results to stdout in a readable format."""
        for idx, (path, text) in enumerate(results.items(), start=1):
            print()
            print("=" * 72)
            print(f"[{idx}] {path}")
            print("=" * 72)
            print(text if text.strip() else "(không phát hiện văn bản)")
        print()


# ---------------------------------------------------------------------- #
# CLI entry point
# ---------------------------------------------------------------------- #
def _main() -> int:
    import sys

    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(
            "Sử dụng:\n"
            "    python ocr_module.py IMG1 [IMG2 ... IMG5] --lang {vi|en|ja|ch|ch_tra}\n\n"
            "Ví dụ:\n"
            "    python ocr_module.py scan.png --lang vi\n"
            "    python ocr_module.py p1.jpg p2.jpg p3.jpg --lang ja\n\n"
            f"Ngôn ngữ hỗ trợ: {', '.join(SUPPORTED_LANGS)}\n"
            f"Tối đa {MAX_IMAGES} ảnh mỗi lần."
        )
        return 0

    lang = "en"
    if "--lang" in argv:
        i = argv.index("--lang")
        try:
            lang = argv[i + 1]
        except IndexError:
            print("Thiếu giá trị cho --lang")
            return 2
        argv = argv[:i] + argv[i + 2 :]

    if not argv:
        print("Bạn chưa truyền đường dẫn ảnh nào.")
        return 2

    ocr = OCRModule()
    print(f"Đang nhận diện {len(argv)} ảnh với ngôn ngữ '{lang}'...")
    try:
        results = ocr.recognize_batch(argv, lang=lang)
    except ValueError as exc:
        print(f"Lỗi: {exc}")
        return 2
    ocr.print_results(results)
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
