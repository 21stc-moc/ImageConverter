from fastapi import APIRouter, UploadFile, File
from function import Convert, Download

router = APIRouter()

@router.get("/download")
def download_image(url, type, total, prefix=""):
    result = Download.download(url, type, prefix, total)
    return result


@router.post("/convert")
def convert_image(format, type, file: UploadFile = File(...)):
    result = Convert.convert(format, type, file)
    return result


@router.post("/convert-multi")
def convert_multi_image(format, files: list[UploadFile] = File(...)):
    result = Convert.convert_multi(format, files)
    return result


@router.post("/ocr")
def image_to_text(lang: str, files: list[UploadFile] = File(...)):
    """
    Nhận diện văn bản từ tối đa 5 ảnh.
    Query params:
        lang : vi | en | ja | ch | ch_tra
    Form data:
        files : multipart, nhiều file cùng tên 'files'
    """
    return Convert.ocr_multi(lang, files)