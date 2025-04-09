# Conway Interview Take-Home Assignment

Thank you for participating in our interview process!

---

## General Guidelines

**Time Expectation**: Plan to spend **3–4 hours** on this assignment. We do not expect a production-ready solution, but we do value a thoughtful, well-structured approach.

### Submission

Please submit two items: 
1. Submit your code as a GitHub repository (or alternative VCS hosting service), and provide clear instructions on how to run your application in your README.
2. Submit a video of you demoing your work (we suggest Loom).  

> **Questions?** If any aspect of the assignment is unclear, please text Anne at **+1 (917) 833-9231**.

---

## Escalating Test Cases & Scenarios

Regardless of which Option you choose, we suggest creating tests that escalate in difficulty and complexity. Here are general ideas:

### Small vs. Large Data

- **Small Scale (Easy)**: Use a small dataset (e.g., 10 records or files) for quick iteration and debugging.
- **Medium Scale (Intermediate)**: Expand to a moderate dataset (e.g., 100–500 records or files).
- **Large Scale (Advanced)**: Test with 1,000 or more records/files to see if your solution still performs or if it needs optimizations.

### Feature Depth

- **Basic (Easy)**: Simple threshold-based or keyword-only logic.
- **Intermediate**: Incorporate multiple factors for anomaly detection or relevance scoring.
- **Advanced**: Employ more sophisticated techniques (e.g., multivariate anomaly detection, TF-IDF with additional weighting or synonyms, etc.).

### Edge Cases & Error Handling

- **Easy**: Single field or single keyword match.
- **Intermediate**: Missing/null values or queries with no matches.
- **Advanced**: Corrupt data, unusual characters, or large, noisy queries that might degrade performance.

Use these progressive ideas to demonstrate how your solution handles increasing levels of complexity.

---

## Your Task

Choose **ONE** of the two options below. Each option allows you to build something interactive while showcasing your chosen tech stack, your coding style, and your approach to problem solving.

---

## Option 1: Work with Government Data

Create a full-stack application that allows a user to find **anomalies** in your choice of a public dataset from [data.gov](https://data.gov).

### Dataset Selection

- Choose a dataset from data.gov that you find interesting or relevant.
- Explain **why** you chose this dataset (in your README).

### Data Processing

- Implement backend logic to process and analyze the data.
- Provide a brief explanation (in your README or code comments) describing your definition of _"anomaly"_ in the context of the chosen dataset.

### Backend

- Use any server-side language or framework you're comfortable with (e.g., Python/Flask, Node/Express, Ruby on Rails, etc.).
- Consider your architecture for handling data ingestion, cleaning, transformation, and anomaly detection.

### Frontend

- Use a modern JavaScript framework (React, Vue, Angular, etc.).
- Visualize the data in a clear, interactive manner (e.g., charts, tables, dynamic elements).
- Highlight anomalies (or suspicious data points) and allow the user to filter or interact with the dataset.

### Data Storage

- You may choose any storage solution (relational/NoSQL/Postgres/SQLite/file-based) as appropriate.
- If relevant, integrate or briefly describe how your chosen database interacts with the data.

### User Interaction

- Include at least one feature that lets users dynamically filter, sort, or query the data to focus on potential anomalies.

---

### Suggested Testing Approach for Option 1

**Easy**:

- Use a small subset (10–20 records) with a straightforward numeric anomaly (e.g., values above a certain threshold).
- Manually verify flagged anomalies.

**Intermediate**:

- Scale up to 100–200 records.
- Test more than one anomaly criterion (e.g., outliers in multiple numeric columns).
- Check how the filtering mechanism responds to different user inputs.

**Advanced**:

- Analyze 1,000+ records.
- Implement a more complex anomaly detection technique (e.g., z-score for multiple features, time-series based anomalies).
- Evaluate performance and consider edge cases like missing data or extremely high variance.

---

## Option 2: Build a File Selector

Implement a naive **file selector system** that can enhance the context in a user query or complaint. The system should identify and retrieve relevant files from a repository based on user queries, scoring how "pertinent" the file content is.

### Sample Repository

- Create a repository of at least 20 files with varied topics (e.g., different products, documentation, logs, random content).
- Files can be in multiple formats (text, markdown, config, etc.) or in a single format.

### Relevance Scoring

- Implement at least two different strategies to rank how likely a file is relevant to a given query.
- Examples: TF-IDF, cosine similarity, keyword match with weighting, etc.

### Interface

- Build a simple search/interrogation interface where a user can type a query or complaint and see a list of matching files.
- Indicate the "relevance score" or ranking for each returned file.

### Threshold Mechanism

- Provide an option for the user to set or adjust a relevance threshold.
- Files below the threshold are not included in the "selected context."

### View Selected Context

- Display the text or relevant snippet of each selected file so users can see why it was pulled in.

### Implementation Details

- You may choose any language/framework (if you prefer scripting in Python, a Node web app, etc.).

**Clearly explain in your README**:

- Your approach to calculating relevance.
- How you might refine or improve your algorithm given more time.

---

### Suggested Testing Approach for Option 2

**Easy**:

- Use ~10 files.
- Implement a single keyword-based matching or a simple substring check.
- Test queries that exactly match one file, multiple files, and zero files.

**Intermediate**:

- Expand to 50–100 files.
- Add a second matching algorithm (e.g., TF-IDF) and compare results.
- Test partial matches, synonyms, or different weighting factors.

**Advanced**:

- Scale up to 1,000+ files.
- Incorporate complex text analytics (e.g., n-gram analysis, semantic similarity).
- Measure performance and ensure the search remains responsive.

---

## Extra Credit (Optional, but Appreciated)

- **Unit Tests**: Provide tests for critical parts of your code (anomaly detection, relevance ranking, or other logic).
- **Performance Considerations**: Briefly discuss if (and how) your solution scales to larger data sets or more complex queries.
- **Creative Extensions**: For example, using advanced data visualization libraries, adding authentication/authorization, or including additional search operators (wildcards, partial matches, synonyms, etc.).
- **Edge Case Handling**: Demonstrate thoughtful handling of potential pitfalls (e.g., empty datasets, missing files, special characters).

---

## Final Notes

The goal of this assignment is not only to see a working application but to gain insight into how you approach real-world coding tasks:

- How do you structure your project?
- How do you approach solving a specific problem with a given set of tools?
- How do you handle less-defined features and turn them into coherent solutions?

We look forward to seeing your work and your approach to escalating test scenarios! Good luck and thank you for your time and effort.

