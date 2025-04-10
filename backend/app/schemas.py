from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class NotebookBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None

class NotebookCreate(NotebookBase):
    pass

class Notebook(NotebookBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DatasetBase(BaseModel):
    name: str
    notebook_id: int

class DatasetCreate(DatasetBase):
    pass

class Dataset(DatasetBase):
    id: int
    file_path: str
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnalysisBase(BaseModel):
    notebook_id: int
    query: str

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    id: int
    result: Dict[str, Any]
    visualization: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True 