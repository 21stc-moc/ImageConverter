from fastapi import APIRouter, UploadFile, File
import function

router = APIRouter()

@router.post("/convert")
def convert_image(format, type, file: UploadFile = File(...)):
    result = function.convert(format, type, file)
    return result


@router.post("/convert-multi")
def convert_multi_image(format, files: list[UploadFile] = File(...)):
    result = function.convert_multi(format, files)
    return result