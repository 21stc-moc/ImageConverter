from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import service

app = FastAPI()
#Enable CORS
origins = [ "http://localhost:5173", "http://192.168.2.197:2100" ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(service.router)

@app.get("/")
async def main():
    return {"message": "NVTOON FastAPI Service"}