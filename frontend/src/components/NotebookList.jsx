import { useState } from 'react';
import NotebookItem from './NotebookItem';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function NotebookList() {
  const [notebooks, setNotebooks] = useState([
    { id: 1, title: 'My First Notebook', lastModified: '2024-04-09' },
    { id: 2, title: 'Project Notes', lastModified: '2024-04-08' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastModified');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleNotebookClick = (notebookId) => {
    // TODO: Implement navigation to notebook detail page
    console.log('Navigate to notebook:', notebookId);
  };

  const handleCreateNotebook = () => {
    // TODO: Implement create notebook functionality
    console.log('Create new notebook');
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
      // Default sort by lastModified
      return sortOrder === 'asc'
        ? new Date(a.lastModified) - new Date(b.lastModified)
        : new Date(b.lastModified) - new Date(a.lastModified);
    });

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
            onClick={handleCreateNotebook}
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
              onClick={handleCreateNotebook}
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
            />
          ))}
        </div>
      )}
    </div>
  );
} 