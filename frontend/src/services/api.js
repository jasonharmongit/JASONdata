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
    const response = await fetch(
      `${API_BASE_URL}/notebooks/${id}/data?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch notebook data");
    }
    return response.json();
  },
};
