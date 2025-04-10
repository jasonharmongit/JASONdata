from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime
from typing import Optional

app = FastAPI()

@app.post('/api/notebooks')
async def create_notebook(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    table_name: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        if not all([title, table_name, file]):
            raise HTTPException(status_code=400, detail='Missing required fields')

        # Save the file
        filename = file.filename
        file_path = os.path.join('uploads', filename)  # Make sure the uploads directory exists
        
        # Create uploads directory if it doesn't exist
        os.makedirs('uploads', exist_ok=True)
        
        # Save the file
        with open(file_path, 'wb') as buffer:
            content = await file.read()
            buffer.write(content)

        # Create a new notebook
        notebook = {
            'id': str(uuid.uuid4()),
            'title': title,
            'description': description,
            'table_name': table_name,
            'file_path': file_path,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        # Save the notebook to the database
        notebooks.append(notebook)

        return JSONResponse(content=notebook, status_code=201)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 