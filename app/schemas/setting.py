from pydantic import BaseModel

class Setting(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True
