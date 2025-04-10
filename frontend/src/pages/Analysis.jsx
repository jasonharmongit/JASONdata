import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notebookApi } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function Analysis() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotebook = async () => {
      try {
        setIsLoading(true);
        const data = await notebookApi.getOne(notebookId);
        setNotebook(data);
        setError(null);
      } catch (err) {
        setError('Failed to load notebook');
        console.error('Error fetching notebook:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (notebookId) {
      fetchNotebook();
    }
  }, [notebookId]);

  const handleBackClick = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen max-w-none m-0 p-0 bg-gray-900">
        <header className="w-full border-b border-gray-800">
          <div className="container mx-auto py-4">
            <div className="flex items-center">
              <button
                onClick={handleBackClick}
                className="mr-4 text-gray-400 hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-medium tracking-tight text-gray-100">
                <span>JASON</span>
                <span className="text-teal-400">data</span>
                <span className="ml-4">|<span className="ml-4">Analysis</span></span>
              </h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading notebook...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-screen max-w-none m-0 p-0 bg-gray-900">
        <header className="w-full border-b border-gray-800">
          <div className="container mx-auto py-4">
            <div className="flex items-center">
              <button
                onClick={handleBackClick}
                className="mr-4 text-gray-400 hover:text-gray-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-medium tracking-tight text-gray-100">
                <span>JASON</span>
                <span className="text-teal-400">data</span>
                <span className="ml-4">|<span className="ml-4">Analysis</span></span>
              </h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen max-w-none m-0 p-0 bg-gray-900">
      <header className="w-full border-b border-gray-800">
        <div className="container mx-auto py-4">
          <div className="flex items-center">
            <button
              onClick={handleBackClick}
              className="mr-4 text-gray-400 hover:text-gray-200"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-medium tracking-tight text-gray-100">
              <span>JASON</span>
              <span className="text-teal-400">data</span>
              <span className="ml-4">|<span className="ml-4">Analysis</span></span>
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {notebook && (
          <div>
            <h2 className="text-xl font-medium text-gray-100 mb-4">{notebook.title}</h2>
            {notebook.description && (
              <p className="text-gray-400 mb-6">{notebook.description}</p>
            )}
            {/* TODO: Add analysis tools and visualizations here */}
          </div>
        )}
      </main>
    </div>
  );
} 