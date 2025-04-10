const handleCreateNotebook = async (data) => {
  try {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('table_name', data.table_name);
    formData.append('file', data.file);

    const response = await fetch('/api/notebooks', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to create notebook');
    }

    const newNotebook = await response.json();
    setNotebooks([...notebooks, newNotebook]);
    setIsCreateModalOpen(false);
  } catch (error) {
    console.error('Error creating notebook:', error);
    throw error;
  }
}; 