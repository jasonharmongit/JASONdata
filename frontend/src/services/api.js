const API_BASE_URL = "http://localhost:8000";

export const notebookApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/notebooks/`);
    if (!response.ok) {
      throw new Error("Failed to fetch notebooks");
    }
    return response.json();
  },

  getOne: async (id) => {
    const response = await fetch(`${API_BASE_URL}/notebooks/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch notebook");
    }
    return response.json();
  },

  create: async (notebook) => {
    const formData = new FormData();
    formData.append("title", notebook.title);
    formData.append("description", notebook.description || "");
    formData.append("table_name", notebook.table_name);
    formData.append("file", notebook.file);

    const response = await fetch(`${API_BASE_URL}/notebooks/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create notebook");
    }
    return response.json();
  },

  update: async (id, notebook) => {
    const response = await fetch(`${API_BASE_URL}/notebooks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notebook),
    });
    if (!response.ok) {
      throw new Error("Failed to update notebook");
    }
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/notebooks/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete notebook");
    }
    return response.json();
  },

  getData: async (id, options = {}) => {
    const { limit = 1000, offset = 0 } = options;
    console.log(
      `Fetching data for notebook ${id} with limit=${limit}, offset=${offset}`
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/notebooks/${id}/data?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          `Failed to fetch notebook data: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("API response data:", data);

      if (!data.table_name) {
        console.warn("Table name is missing from API response:", data);
      }

      return data;
    } catch (error) {
      console.error("Error in getData:", error);
      throw error;
    }
  },

  executeQuery: async (id, query, options = {}) => {
    console.log(`Executing query for notebook ${id}: ${query}`);

    try {
      const { limit = 1000, offset = 0 } = options;
      const response = await fetch(
        `${API_BASE_URL}/notebooks/${id}/execute-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit, offset }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        // Extract the detailed error message from the response
        const errorMessage =
          errorData.detail ||
          `Failed to execute query: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Query execution response:", data);
      return data;
    } catch (error) {
      console.error("Error in executeQuery:", error);
      throw error;
    }
  },

  getAnalysisReport: async (id) => {
    console.log(`Generating analysis report for notebook ${id}`);

    try {
      const response = await fetch(
        `${API_BASE_URL}/notebooks/${id}/analysis-report`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          `Failed to generate analysis report: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Analysis report response:", data);
      return data;
    } catch (error) {
      console.error("Error in getAnalysisReport:", error);
      throw error;
    }
  },
};
