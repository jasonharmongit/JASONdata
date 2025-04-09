import { useState } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export default function NotebookItem({ notebook, onNotebookClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    // TODO: Implement action handlers
    console.log(`${action} notebook:`, notebook.id);
    setIsMenuOpen(false);
  };

  return (
    <div
      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-700"
      onClick={() => onNotebookClick(notebook.id)}
    >
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-100">{notebook.title}</h3>
        <p className="text-sm text-gray-400">Last modified: {notebook.lastModified}</p>
      </div>
      <div className="relative">
        <button
          onClick={handleMenuClick}
          className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-200"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-700">
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              onClick={(e) => handleAction(e, 'edit')}
            >
              Edit
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              onClick={(e) => handleAction(e, 'share')}
            >
              Share
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
              onClick={(e) => handleAction(e, 'delete')}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 