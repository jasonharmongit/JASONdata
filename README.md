# JASONdata - Data Analysis Web Application

## Overview

JASONdata ("Just an App to Sort, Organize, and Navigate data") is a web application that allows users to analyze their datasets through an intuitive interface. The application features dataset upload and analysis, anomaly detection, data sorting and filtering, interactive data visualization, and natural language querying capabilities.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn package manager

## Project Structure

```
JASONdata/
├── frontend/          # React frontend application
├── backend/           # FastAPI backend server
├── data/             # Dataset storage
└── README.md         # This file
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd JASONdata
```

### 2. Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up the PostgreSQL database:

   ```bash
   # Start PostgreSQL service if not running
   # On macOS/Linux:
   sudo service postgresql start
   # On Windows:
   # Start PostgreSQL from Services

   # Create the database
   createdb jasondata

   # Create a new user (if needed)
   createuser -P <username>
   # Enter a password when prompted

   # Grant privileges to the user
   psql -d jasondata -c "GRANT ALL PRIVILEGES ON DATABASE jasondata TO <username>;"
   ```

5. Configure database connection:

   - Create a `.env` file in the backend directory if it doesn't exist
   - Add the following line:
     ```
     DATABASE_URL=postgresql://<username>:<password>@localhost:5432/jasondata
     ```

6. Run database migrations:
   ```bash
   # Make sure you're in the backend directory with venv activated
   alembic upgrade head
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

## Running the Application

### 1. Start the Backend Server

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Activate the virtual environment (if not already activated):

   ```bash
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Start the FastAPI server:
   ```bash
   uvicorn app:app --reload
   ```

The backend server will start on `http://localhost:8000`

### 2. Start the Frontend Development Server

1. Open a new terminal and navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

The frontend application will be available at `http://localhost:5173`

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Chart.js
- Backend: Python, FastAPI, Pandas, NumPy, Scikit-learn
- Database: PostgreSQL

## Why I chose the dataset:

- Wanted to deal with large amounts of data, because it is much harder (especially for a non-technical person) to detect anomolies and get any sort of meaningful information out of it
- Some relevancy to consumer preferences (Electric Vehicles)

## Definintion of an anomaly (in this dataset):

- I think there are 2 types of anomalies in a dataset like the one I chose, which has usage/preference type of data:
    1. Outliers - these are obviously anomalous in the strictest sense of the word. These are data that deviates far away from the main body of data. I found outliers by observing boxplots, histograms, and bar charts, as well as top values per z-score.
    2. Unexpected norms - an anomaly can also be defined as something that is unexpected, even if it isn't a single datapoint that is far outside the typical bounds. This could include macro trends or patterns that are subtle but significant, or a datapoint that is unexpected specifically _because_ it is normal, and it wouldn't be expected to be. For example, in this dataset about EV usage in Washington, it would be surprising if the number of EVs per capita in Seattle was the same as a rural town. Though technically they would both be "average", because we know of other variables not included in the dataset (such as income and charging availability), this result would be surprising, and thus, anomalous.