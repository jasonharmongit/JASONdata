import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotebookItem from './NotebookItem';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { notebookApi } from '../services/api';
import DataUploadModal from './DataUploadModal';

export default function NotebookList() {
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      setIsLoading(true);
      const data = await notebookApi.getAll();
      setNotebooks(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notebooks');
      console.error('Error fetching notebooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotebookClick = (notebookId) => {
    navigate(`/analysis/${notebookId}`);
  };

  const handleCreateNotebook = async (data) => {
    try {
      const newNotebook = await notebookApi.create({
        title: data.title,
        description: data.description,
        table_name: data.table_name,
        file: data.file
      });
      setNotebooks([...notebooks, newNotebook]);
      navigate(`/analysis/${newNotebook.id}`);
    } catch (err) {
      setError('Failed to create notebook');
      console.error('Error creating notebook:', err);
      throw err;
    }
  };

  const handleDeleteNotebook = async (notebookId) => {
    try {
      await notebookApi.delete(notebookId);
      setNotebooks(notebooks.filter(nb => nb.id !== notebookId));
    } catch (err) {
      setError('Failed to delete notebook');
      console.error('Error deleting notebook:', err);
    }
  };

  const filteredAndSortedNotebooks = notebooks
    .filter(notebook => 
      notebook.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      // Default sort by updated_at
      return sortOrder === 'asc'
        ? new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at)
        : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Loading notebooks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={fetchNotebooks}
            className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notebooks..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-4">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="lastModified">Last Modified</option>
            <option value="title">Title</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 hover:bg-gray-700"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Notebook</span>
          </button>
        </div>
      </div>

      {filteredAndSortedNotebooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {searchQuery 
              ? 'No notebooks match your search'
              : 'No notebooks yet. Create your first notebook!'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Notebook</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedNotebooks.map((notebook) => (
            <NotebookItem
              key={notebook.id}
              notebook={notebook}
              onNotebookClick={handleNotebookClick}
              onDelete={() => handleDeleteNotebook(notebook.id)}
            />
          ))}
        </div>
      )}

      <DataUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateNotebook}
      />
    </div>
  );
} 