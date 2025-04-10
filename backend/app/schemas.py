from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class NotebookBase(BaseModel):
    title: str
    description: Optional[str] = None
    table_name: Optional[str] = None

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
    file_path: Optional[str] = None
    dataset_metadata: Optional[Dict[str, Any]] = None
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

class DataResponse(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[str]
    total: int

    class Config:
        from_attributes = True 