from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional, Any
from typing import List, Dict, Optional
import pandas as pd
import os
import logging
import re
from . import models, schemas
from .database import engine, get_db
from pydantic import BaseModel
import numpy as np
import sys, json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
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
        logger.info(f"Starting analysis report generation for notebook {notebook_id}")
        
        # Get the notebook to find the table name
        notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
        if not notebook:
            logger.error(f"Notebook {notebook_id} not found")
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        if not notebook.table_name:
            logger.error(f"Notebook {notebook_id} has no associated dataset")
            raise HTTPException(status_code=400, detail="No dataset associated with this notebook")

        logger.info(f"Reading data from table {notebook.table_name}")
        # Read the data using pandas
        query = f"SELECT * FROM {notebook.table_name}"
        df = pd.read_sql_query(query, db.get_bind())
        logger.info(f"Successfully read {len(df)} rows and {len(df.columns)} columns")
        
        # Initialize the report structure
        report = {
            "numeric_stats": {},
            "categorical_stats": {},
            "missing_values": {},
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "numeric_distributions": {}
        }
        
        logger.info("Starting numeric column detection and conversion")
        # First pass: attempt to convert all columns to numeric
        numeric_columns = {}
        for column in df.columns:
            try:
                # Skip if already numeric
                if pd.api.types.is_numeric_dtype(df[column]):
                    logger.debug(f"Column '{column}' is already numeric")
                    numeric_columns[column] = df[column]
                    continue
                
                logger.debug(f"Attempting to convert column '{column}' to numeric")
                # Try to convert to numeric, keeping non-numeric values as NaN
                numeric_series = pd.to_numeric(df[column], errors='coerce')
                
                # Only consider it numeric if we have a reasonable conversion rate
                # (at least 70% of non-null values converted successfully)
                non_null_count = df[column].notna().sum()
                if non_null_count > 0:
                    success_rate = numeric_series.notna().sum() / non_null_count
                    if success_rate >= 0.7:
                        numeric_columns[column] = numeric_series
                        logger.info(f"Successfully converted column '{column}' to numeric with {success_rate:.1%} success rate")
                    else:
                        logger.debug(f"Column '{column}' conversion rate {success_rate:.1%} below threshold, treating as categorical")
            except Exception as e:
                logger.debug(f"Could not convert column '{column}' to numeric: {str(e)}")
        
        logger.info(f"Found {len(numeric_columns)} numeric columns out of {len(df.columns)} total columns")
        
        # Analyze each column
        logger.info("Starting column analysis")
        for column in df.columns:
            logger.debug(f"Analyzing column: {column}")
            
            # Count missing values
            missing_count = int(df[column].isnull().sum())
            report["missing_values"][column] = missing_count
            logger.debug(f"Column '{column}' has {missing_count} missing values")
            
            # If column was successfully converted to numeric
            if column in numeric_columns:
                logger.debug(f"Processing numeric column: {column}")
                clean_series = numeric_columns[column].dropna()
                if len(clean_series) > 0:  # Only process if we have data points
                    logger.debug(f"Calculating distribution for column '{column}' with {len(clean_series)} valid points")
                    try:
                        # Calculate histogram bins with a maximum number of bins
                        MAX_HISTOGRAM_BINS = 50
                        hist_values, hist_bins = np.histogram(clean_series, bins=min(MAX_HISTOGRAM_BINS, int(np.sqrt(len(clean_series)))))
                        logger.debug(f"Generated histogram with {len(hist_bins)-1} bins")
                        
                        # Convert numpy types to Python native types for JSON serialization
                        hist_values = hist_values.tolist()
                        hist_bins = hist_bins.tolist()
                        
                        # Calculate boxplot statistics
                        q1 = float(clean_series.quantile(0.25))
                        q2 = float(clean_series.median())
                        q3 = float(clean_series.quantile(0.75))
                        iqr = q3 - q1
                        whisker_min = float(clean_series[clean_series >= q1 - 1.5 * iqr].min())
                        whisker_max = float(clean_series[clean_series <= q3 + 1.5 * iqr].max())
                        
                        # Store distribution data
                        report["numeric_distributions"][column] = {
                            "histogram": {
                                "counts": hist_values,
                                "bin_edges": hist_bins,
                            },
                            "boxplot": {
                                "whisker_min": whisker_min,
                                "q1": q1,
                                "median": q2,
                                "q3": q3,
                                "whisker_max": whisker_max,
                            }
                        }
                        
                        # Store basic statistics
                        report["numeric_stats"][column] = {
                            "min": float(clean_series.min()),
                            "max": float(clean_series.max()),
                            "mean": float(clean_series.mean()),
                            "std": float(clean_series.std()),
                            "missing_count": missing_count
                        }
                        logger.debug(f"Successfully calculated all statistics for column '{column}'")
                    except Exception as e:
                        logger.error(f"Error calculating statistics for column '{column}': {str(e)}")
                        raise
                else:
                    logger.warning(f"Column '{column}' has no valid numeric data after cleaning")
            
            # For non-numeric columns (or failed conversions), treat as categorical
            if column not in numeric_columns:
                logger.debug(f"Processing categorical column: {column}")
                value_counts = df[column].value_counts()
                unique_count = len(value_counts)
                
                # If we have too many unique values, only take the top N
                MAX_CATEGORICAL_VALUES = 50
                if unique_count > MAX_CATEGORICAL_VALUES:
                    logger.info(f"Column '{column}' has {unique_count} unique values, limiting to top {MAX_CATEGORICAL_VALUES}")
                    value_counts = value_counts.head(MAX_CATEGORICAL_VALUES)
                
                # Convert to dictionary and ensure all keys are strings
                value_counts_dict = {str(k): int(v) for k, v in value_counts.items()}
                report["categorical_stats"][column] = value_counts_dict
                # Add missing count to a separate section
                report["missing_values"][column] = missing_count
                logger.debug(f"Stored {len(value_counts_dict)} categories for column '{column}' (total unique: {unique_count})")
        
        # Log the size of the report before returning
        report_json = json.dumps(report)
        report_size_mb = sys.getsizeof(report_json) / (1024 * 1024)
        logger.info(f"Final report size: {report_size_mb:.2f} MB")
        
        if report_size_mb > 10:  # Warning if report is larger than 10MB
            logger.warning(f"Large report size ({report_size_mb:.2f} MB). Consider further data reduction.")
            # Log sizes of each component
            for key, value in report.items():
                component_json = json.dumps(value)
                component_size_mb = sys.getsizeof(component_json) / (1024 * 1024)
                logger.warning(f"Component '{key}' size: {component_size_mb:.2f} MB")
        
        logger.info("Analysis report generation completed successfully")
        return report
        
    except Exception as e:
        logger.error(f"Error generating analysis report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 