from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional
import pandas as pd
import os
import logging
import re
from . import models, schemas
from .database import engine, get_db
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JASONdata API",
    description="Backend API for JASONdata analysis platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sanitize_table_name(name: str) -> str:
    """Convert a string to a valid PostgreSQL table name"""
    # Replace non-alphanumeric characters with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9]', '_', name.lower())
    # Ensure it starts with a letter
    if not sanitized[0].isalpha():
        sanitized = 't_' + sanitized
    # Ensure it's not too long (PostgreSQL has a 63-byte limit for identifiers)
    if len(sanitized) > 63:
        sanitized = sanitized[:63]
    return sanitized

@app.get("/")
async def root():
    return {"message": "Welcome to JASONdata API"}

@app.get("/notebooks/", response_model=List[schemas.Notebook])
def get_notebooks(db: Session = Depends(get_db)):
    notebooks = db.query(models.Notebook).all()
    return notebooks

@app.post("/notebooks/", response_model=schemas.Notebook)
async def create_notebook(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    table_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Creating notebook with title: {title}, table_name: {table_name}")
        
        # Sanitize the table name
        sanitized_table_name = sanitize_table_name(table_name)
        logger.info(f"Sanitized table name: {sanitized_table_name}")
        
        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join("uploads", file.filename)
        logger.info(f"Saving file to: {file_path}")
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create the notebook record
        db_notebook = models.Notebook(
            title=title,
            description=description,
            table_name=sanitized_table_name
        )
        db.add(db_notebook)
        db.commit()
        db.refresh(db_notebook)
        logger.info(f"Created notebook record with ID: {db_notebook.id}")
        
        try:
            # Read the uploaded file
            logger.info("Reading CSV file...")
            df = pd.read_csv(file_path)
            logger.info(f"Original columns: {df.columns.tolist()}")
            
            # Clean column names to be valid SQL identifiers
            clean_columns = {}
            for col in df.columns:
                # Convert to lowercase first
                clean_col = col.lower()
                # Replace spaces and special characters with underscores
                clean_col = re.sub(r'[^a-z0-9]', '_', clean_col)
                # Ensure it starts with a letter
                if not clean_col[0].isalpha():
                    clean_col = 'col_' + clean_col
                clean_columns[col] = clean_col
                logger.info(f"Column mapping: {col} -> {clean_col}")
            
            # Rename DataFrame columns
            df = df.rename(columns=clean_columns)
            logger.info(f"Cleaned columns: {df.columns.tolist()}")
            
            # Create a new table with the data
            with engine.connect() as conn:
                # Drop the table if it exists to ensure clean state
                drop_sql = f"DROP TABLE IF EXISTS {sanitized_table_name}"
                logger.info(f"Dropping existing table: {drop_sql}")
                conn.execute(text(drop_sql))
                conn.commit()
                
                # Create the table with cleaned column names
                create_table_sql = f"""
                CREATE TABLE IF NOT EXISTS {sanitized_table_name} (
                    {', '.join([f'"{col}" TEXT' for col in df.columns])}
                )
                """
                logger.info(f"Creating table with SQL: {create_table_sql}")
                conn.execute(text(create_table_sql))
                conn.commit()
                
                # Insert the data
                logger.info(f"Inserting {len(df)} rows into table...")
                
                # Convert DataFrame to list of dictionaries
                data_to_insert = df.to_dict('records')
                
                # Create the insert statement with cleaned column names
                insert_sql = f"""
                INSERT INTO {sanitized_table_name} ({', '.join([f'"{col}"' for col in df.columns])})
                VALUES ({', '.join([':' + col for col in df.columns])})
                """
                logger.info(f"Insert SQL: {insert_sql}")
                
                # Execute the insert for all rows at once
                conn.execute(text(insert_sql), data_to_insert)
                conn.commit()
                logger.info("Data insertion completed successfully")
            
            return db_notebook
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}", exc_info=True)
            # If there's an error, delete the notebook
            db.delete(db_notebook)
            db.commit()
            # Clean up the uploaded file
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error creating notebook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating notebook: {str(e)}")

@app.get("/notebooks/{notebook_id}", response_model=schemas.Notebook)
def get_notebook(notebook_id: int, db: Session = Depends(get_db)):
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook

@app.get("/notebooks/{notebook_id}/data", response_model=schemas.DataResponse)
async def get_notebook_data(
    notebook_id: int,
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    filter_by: Optional[str] = None,
    filter_value: Optional[str] = None
):
    logger.info(f"Fetching data for notebook_id: {notebook_id}")
    
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if not notebook:
        logger.error(f"Notebook not found with ID: {notebook_id}")
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    logger.info(f"Found notebook: {notebook.title}, table_name: {notebook.table_name}")
    
    table_name = notebook.table_name
    if not table_name:
        logger.error(f"Table name is missing for notebook ID: {notebook_id}")
        raise HTTPException(status_code=404, detail="Table not found for this notebook")
    
    query = f"SELECT * FROM {table_name}"
    
    if filter_by and filter_value:
        query += f" WHERE {filter_by}::text ILIKE '%{filter_value}%'"
    
    if sort_by:
        query += f" ORDER BY {sort_by} {sort_order or 'ASC'}"
    
    query += f" LIMIT {limit} OFFSET {offset}"
    
    try:
        logger.info(f"Executing query: {query}")
        result = db.execute(text(query))
        
        # Fix the row conversion issue
        data = []
        for row in result:
            # Convert row to dictionary using a more robust approach
            row_dict = {}
            for i, column in enumerate(result.keys()):
                row_dict[column] = row[i]
            data.append(row_dict)
            
        logger.info(f"Query returned {len(data)} rows")
        
        # Get column names
        columns_query = f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position
        """
        logger.info(f"Fetching columns with query: {columns_query}")
        columns_result = db.execute(text(columns_query))
        columns = [row[0] for row in columns_result]
        logger.info(f"Found columns: {columns}")
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM {table_name}"
        if filter_by and filter_value:
            count_query += f" WHERE {filter_by}::text ILIKE '%{filter_value}%'"
        logger.info(f"Counting rows with query: {count_query}")
        total = db.execute(text(count_query)).scalar()
        logger.info(f"Total row count: {total}")
        
        response = schemas.DataResponse(
            data=data,
            columns=columns,
            total=total,
            table_name=table_name
        )
        logger.info(f"Returning response with table_name: {response.table_name}")
        
        # Verify the response has the table_name field
        response_dict = response.model_dump()
        logger.info(f"Response dictionary keys: {list(response_dict.keys())}")
        logger.info(f"Response table_name value: {response_dict.get('table_name')}")
        
        return response
    except Exception as e:
        logger.error(f"Error fetching data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/notebooks/{notebook_id}", response_model=schemas.Notebook)
def update_notebook(notebook_id: int, notebook: schemas.NotebookCreate, db: Session = Depends(get_db)):
    db_notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if db_notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    for key, value in notebook.model_dump().items():
        setattr(db_notebook, key, value)
    
    db.commit()
    db.refresh(db_notebook)
    return db_notebook

@app.delete("/notebooks/{notebook_id}")
def delete_notebook(notebook_id: int, db: Session = Depends(get_db)):
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Drop the data table if it exists
    if notebook.table_name:
        try:
            with engine.connect() as conn:
                drop_sql = f"DROP TABLE IF EXISTS {notebook.table_name}"
                conn.execute(text(drop_sql))
                conn.commit()
        except Exception as e:
            logger.error(f"Error dropping table {notebook.table_name}: {str(e)}")
    
    db.delete(notebook)
    db.commit()
    return {"message": "Notebook deleted successfully"}

@app.get("/debug/notebook/{notebook_id}/dataset")
def debug_dataset_status(notebook_id: int, db: Session = Depends(get_db)) -> Dict:
    """Debug endpoint to check dataset status for a notebook"""
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        return {"status": "error", "detail": "Notebook not found"}
    
    dataset = db.query(models.Dataset).filter(models.Dataset.notebook_id == notebook_id).first()
    if dataset is None:
        return {
            "status": "error",
            "detail": "No dataset found",
            "notebook": {
                "id": notebook.id,
                "title": notebook.title,
                "file_path": notebook.file_path
            }
        }
    
    file_exists = os.path.exists(dataset.file_path) if dataset.file_path else False
    
    return {
        "status": "success",
        "notebook": {
            "id": notebook.id,
            "title": notebook.title,
            "file_path": notebook.file_path
        },
        "dataset": {
            "id": dataset.id,
            "name": dataset.name,
            "file_path": dataset.file_path,
            "file_exists": file_exists,
            "metadata": dataset.dataset_metadata
        }
    }

@app.post("/notebooks/{notebook_id}/dataset", response_model=schemas.Dataset)
def create_dataset(notebook_id: int, dataset: schemas.DatasetCreate, db: Session = Depends(get_db)):
    """Create a dataset for a notebook"""
    # Check if notebook exists
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Check if dataset already exists for this notebook
    existing_dataset = db.query(models.Dataset).filter(models.Dataset.notebook_id == notebook_id).first()
    if existing_dataset:
        raise HTTPException(status_code=400, detail="Dataset already exists for this notebook")
    
    # Create new dataset
    db_dataset = models.Dataset(
        notebook_id=notebook_id,
        name=dataset.name,
        file_path=os.path.abspath("data/evs.csv"),  # Using the existing CSV file
        dataset_metadata={}  # Empty metadata for now
    )
    
    try:
        # Verify the file exists
        if not os.path.exists(db_dataset.file_path):
            raise HTTPException(status_code=404, detail=f"File not found at {db_dataset.file_path}")
            
        # Try reading the file to verify it's valid
        df = pd.read_csv(db_dataset.file_path)
        db_dataset.dataset_metadata = {
            "columns": df.columns.tolist(),
            "row_count": len(df)
        }
        
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)
        return db_dataset
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating dataset: {str(e)}")

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 1000
    offset: Optional[int] = 0

@app.post("/notebooks/{notebook_id}/execute-query", response_model=schemas.DataResponse)
async def execute_query(notebook_id: int, query_request: QueryRequest, db: Session = Depends(get_db)):
    """Execute a custom SQL query on the notebook's data table"""
    logger.info(f"Executing query for notebook {notebook_id}: {query_request.query}")
    
    # Get the notebook
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if not notebook:
        logger.error(f"Notebook not found with ID: {notebook_id}")
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    table_name = notebook.table_name
    if not table_name:
        logger.error(f"Table name is missing for notebook ID: {notebook_id}")
        raise HTTPException(status_code=404, detail="Table not found for this notebook")
    
    # Validate the query to ensure it only operates on the correct table
    query = query_request.query.strip()
    if not query.lower().startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
    
    # Check if the query contains the correct table name
    if table_name.lower() not in query.lower():
        logger.warning(f"Query may be targeting a different table than {table_name}: {query}")
        # We'll still execute it, but log a warning
    
    try:
        # Execute the query with pagination
        logger.info(f"Executing query: {query} with limit={query_request.limit}, offset={query_request.offset}")
        
        # Execute the paginated query
        paginated_query = f"{query} LIMIT {query_request.limit} OFFSET {query_request.offset}"
        logger.info(f"Executing paginated query: {paginated_query}")
        result = db.execute(text(paginated_query))
        
        # Convert rows to dictionaries
        data = []
        for row in result:
            row_dict = {}
            for i, column in enumerate(result.keys()):
                row_dict[column] = row[i]
            data.append(row_dict)
        
        logger.info(f"Query returned {len(data)} rows")
        
        # Get column names from the result
        columns = result.keys()
        logger.info(f"Query columns: {columns}")
        
        # For the total count, just use the number of rows in the response
        # This is a simplification that works for most queries
        total_count = len(data)
        
        return schemas.DataResponse(
            data=data,
            columns=columns,
            total=total_count,
            table_name=table_name
        )
    except Exception as e:
        logger.error(f"Error executing query: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error executing query: {str(e)}")

@app.get("/notebooks/{notebook_id}/analysis-report", response_model=schemas.AnalysisReport)
async def generate_analysis_report(notebook_id: int, db: Session = Depends(get_db)):
    """Generate a comprehensive analysis report for a notebook's dataset."""
    try:
        # Get the notebook to find the table name
        notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        if not notebook.table_name:
            raise HTTPException(status_code=400, detail="No dataset associated with this notebook")

        # Read the data using pandas
        query = f"SELECT * FROM {notebook.table_name}"
        df = pd.read_sql_query(query, db.get_bind())
        
        # Initialize the report structure
        report = {
            "numeric_stats": {},
            "categorical_stats": {},
            "missing_values": {},
            "total_rows": len(df),
            "total_columns": len(df.columns)
        }
        
        # Attempt to convert columns to numeric where possible
        for column in df.columns:
            # Skip if already numeric
            if pd.api.types.is_numeric_dtype(df[column]):
                continue
                
            # Try to convert to numeric, keeping non-numeric values as NaN
            try:
                # First try direct conversion
                numeric_series = pd.to_numeric(df[column], errors='coerce')
                
                # Check if conversion was successful (not all NaN)
                if not numeric_series.isna().all():
                    # If at least 80% of the values are numeric, consider it a numeric column
                    if numeric_series.notna().sum() / len(numeric_series) >= 0.8:
                        df[column] = numeric_series
                        logger.info(f"Converted column '{column}' to numeric type")
            except Exception as e:
                logger.debug(f"Could not convert column '{column}' to numeric: {str(e)}")
        
        # Analyze each column
        for column in df.columns:
            # Count missing values
            report["missing_values"][column] = df[column].isnull().sum()
            
            # For numeric columns
            if pd.api.types.is_numeric_dtype(df[column]):
                report["numeric_stats"][column] = {
                    "min": float(df[column].min()),
                    "max": float(df[column].max()),
                    "mean": float(df[column].mean()),
                    "std": float(df[column].std())
                }
            
            # For categorical columns (including object type)
            if pd.api.types.is_object_dtype(df[column]) or pd.api.types.is_categorical_dtype(df[column]):
                value_counts = df[column].value_counts().to_dict()
                # Convert any non-string keys to strings for JSON serialization
                report["categorical_stats"][column] = {str(k): int(v) for k, v in value_counts.items()}
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating analysis report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 