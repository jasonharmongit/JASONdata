# JASONdata - Data Analysis Web Application

## Overview

JASONdata is a web application that allows users to analyze their datasets through an intuitive interface. Users can download the application from GitHub and run it locally on their devices.

## Core Features

- Dataset upload and analysis
- Anomaly detection
- Data sorting and filtering
- Interactive data visualization
- Natural language querying

## Interface Layout

### Home Page

- Dashboard view of all notebooks
- Ability to create new notebooks
- Quick access to recent analyses

### Notebook Analysis Interface

The analysis interface consists of two main sections:

1. **Top Section**: Analysis Flow

   - Natural language query interface
   - Generated answers and graphs
   - Top-to-bottom flow visualization

2. **Bottom Section**: Data View
   - Spreadsheet-like data display
   - Dynamic updates based on user queries
   - Interactive data manipulation

## Tech Stack

### Frontend

- React (JavaScript)
- Vite
- Tailwind CSS for styling
- Chart.js for data visualization

### Backend

- Python with FastAPI
- Pandas for data processing
- NumPy for numerical computations
- Scikit-learn for anomaly detection algorithms

### Database

- PostgreSQL for structured data storage and complex queries

## Development Plan

1. **Project Structure Setup**

   - Set up the basic React application structure
   - Configure routing for the Home page and Notebook view
   - Set up the layout components (header, navigation, etc.)

2. **Home Page Development**

   - Create the main dashboard view
   - Implement the notebook list/grid display
   - Add functionality to create new notebooks
   - Design a clean, modern UI using Tailwind CSS

3. **Notebook Analysis Interface**

   - Create the split-pane layout (top for flow/analysis, bottom for data)
   - Implement the natural language query interface
   - Set up the data grid/spreadsheet component
   - Integrate Chart.js for data visualization

4. **Backend Integration**

   - Set up the FastAPI backend
   - Create endpoints for:
     - Notebook CRUD operations
     - Data upload and processing
     - Anomaly detection
     - Data filtering and sorting
   - Implement PostgreSQL database integration

5. **Data Processing Features**
   - Implement data upload functionality
   - Add data preprocessing capabilities
   - Integrate anomaly detection algorithms
   - Create data filtering and sorting mechanisms
