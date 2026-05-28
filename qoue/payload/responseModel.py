# from pydantic import BaseModel
# from typing import Generic, TypeVar, Optional
from typing import TypeVar, Optional
T = TypeVar("T")

# class ResponseModel(BaseModel, Generic[T]):
#     code: int = 1
#     message: str = ""
#     data: Optional[T] = None


def ResponseModel(code: int = 1, message: str = "", data: Optional[T] = None):
    return {
        "code": code,
        "message": message,
        "data": data
    }