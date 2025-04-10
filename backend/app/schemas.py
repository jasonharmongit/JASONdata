from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List, Union

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
    data: List[Dict]
    columns: List[str]
    total: int
    table_name: str

    class Config:
        from_attributes = True

class AnalysisReport(BaseModel):
    numeric_stats: Dict[str, Dict[str, Any]]  # min, max, mean, std for numeric columns
    categorical_stats: Dict[str, Dict[str, int]]  # value counts for categorical columns
    missing_values: Dict[str, int]  # count of missing values per column
    total_rows: int
    total_columns: int
    numeric_distributions: Dict[str, Dict[str, Dict[str, Union[List[float], float]]]]  # histogram and boxplot data

    class Config:
        from_attributes = True 