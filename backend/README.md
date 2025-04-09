# JASONdata Backend

This is the backend service for the JASONdata platform, built with FastAPI and PostgreSQL.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt --prefer-binary
```

3. Set up environment variables:
   Create a `.env` file in the backend directory with:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jasondata
```

4. Initialize the database:

```bash
# Make sure PostgreSQL is running and create the database
createdb jasondata

# Run database migrations
alembic upgrade head
```

5. Run the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000
API documentation will be available at http://localhost:8000/docs
