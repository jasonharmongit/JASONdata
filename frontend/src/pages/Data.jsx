import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { notebookApi } from '../services/api';

const Data = () => {
  const location = useLocation();
  const notebookId = location.state?.notebookId;
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!notebookId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await notebookApi.getData(notebookId, { limit: 1000 });
        setData(response.data);
        setColumns(response.columns);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        setError('Failed to load data');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [notebookId]);

  return (
    <div className="min-h-screen w-screen max-w-none m-0 p-0 bg-gray-900">
      <header className="w-full border-b border-gray-800">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="mr-4 text-gray-400 hover:text-gray-200">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-medium tracking-tight text-gray-100">
                <span>JASON</span>
                <span className="text-teal-400">data</span>
                <span className="ml-4">|</span>
                <span className="ml-4">
                  <Link 
                    to={notebookId ? `/analysis/${notebookId}` : "/analysis"} 
                    className="text-gray-400 hover:text-gray-200"
                  >
                    Analysis
                  </Link>
                  <span className="mx-2 text-gray-600">|</span>
                  <Link to="/data" className="text-gray-100">Data</Link>
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-medium text-gray-100 mb-4">Data Preview</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No data available</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-700"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {data.map((row, rowIndex) => (
                      <tr key={row.id || rowIndex} className="hover:bg-gray-700">
                        {columns.map((column) => (
                          <td
                            key={`${row.id || rowIndex}-${column}`}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
                          >
                            {row[column] !== null && row[column] !== undefined
                              ? typeof row[column] === 'object'
                                ? JSON.stringify(row[column])
                                : String(row[column])
                              : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-gray-700 px-6 py-3 text-sm text-gray-300">
              Showing {data.length} of {total} rows
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Data; 