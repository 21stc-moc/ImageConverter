from fastapi import APIRouter, UploadFile, File
from function import images

router = APIRouter()

@router.post("/convert")
def convert_image(format, type, file: UploadFile = File(...)):
    result = images.convert(format, type, file)
    return result


@router.post("/convert-multi")
def convert_multi_image(format, files: list[UploadFile] = File(...)):
    result = images.convert_multi(format, files)
    return (result)

@router.post("/ocr")
def image_to_text(lang: str, files: list[UploadFile] = File(...)):
    """
    Nhận diện văn bản từ tối đa 5 ảnh.
    Query params:
        lang : vi | en | ja | ch | ch_tra
    Form data:
        files : multipart, nhiều file cùng tên 'files'
    """
    return images.ocr_multi(lang, files)