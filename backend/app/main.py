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
                # Replace spaces and special characters with underscores
                clean_col = re.sub(r'[^a-zA-Z0-9]', '_', col)
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
def get_notebook_data(
    notebook_id: int,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    # Get the notebook
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    if not notebook.table_name:
        raise HTTPException(status_code=404, detail="No data table found for this notebook")
    
    try:
        # Query the data table
        with engine.connect() as conn:
            # Get the total count
            count_sql = f"SELECT COUNT(*) FROM {notebook.table_name}"
            total = conn.execute(text(count_sql)).scalar()
            
            # Get the data
            data_sql = f"""
            SELECT * FROM {notebook.table_name}
            LIMIT {limit} OFFSET {offset}
            """
            result = conn.execute(text(data_sql))
            
            # Get column names
            columns = result.keys()
            
            # Convert to list of dictionaries
            data = [dict(zip(columns, row)) for row in result]
        
        return {
            "data": data,
            "columns": columns,
            "total": total
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading data: {str(e)}"
        )

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