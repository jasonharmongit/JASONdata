from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from .database import engine, get_db

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

@app.get("/")
async def root():
    return {"message": "Welcome to JASONdata API"}

@app.get("/notebooks/", response_model=List[schemas.Notebook])
def get_notebooks(db: Session = Depends(get_db)):
    notebooks = db.query(models.Notebook).all()
    return notebooks

@app.post("/notebooks/", response_model=schemas.Notebook)
def create_notebook(notebook: schemas.NotebookCreate, db: Session = Depends(get_db)):
    db_notebook = models.Notebook(**notebook.model_dump())
    db.add(db_notebook)
    db.commit()
    db.refresh(db_notebook)
    return db_notebook

@app.get("/notebooks/{notebook_id}", response_model=schemas.Notebook)
def get_notebook(notebook_id: int, db: Session = Depends(get_db)):
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook

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
    
    db.delete(notebook)
    db.commit()
    return {"message": "Notebook deleted successfully"} 