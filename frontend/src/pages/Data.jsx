import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, ChevronUpIcon, ChevronDownIcon, FunnelIcon, XMarkIcon, CodeBracketIcon, PlayIcon } from '@heroicons/react/24/outline';
import { notebookApi } from '../services/api';

const Data = () => {
  const location = useLocation();
  const notebookId = location.state?.notebookId;
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [tableName, setTableName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [showAdvancedQuery, setShowAdvancedQuery] = useState(false);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const sqlQueryRef = useRef('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const filterRefs = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      if (!notebookId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await notebookApi.getData(notebookId, { limit: 1000 });
        console.log('Data response:', response);
        console.log('Table name from response:', response.table_name);
        
        if (!response.table_name) {
          console.error('Table name is missing from response:', response);
          setError('Table name is missing from server response');
          return;
        }
        
        setData(response.data);
        setColumns(response.columns);
        setTotal(response.total);
        setTableName(response.table_name);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          response: err.response
        });
        setError('Failed to load data: ' + (err.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [notebookId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeFilterColumn && 
          filterRefs.current[activeFilterColumn] && 
          !filterRefs.current[activeFilterColumn].contains(event.target)) {
        setActiveFilterColumn(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeFilterColumn]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const toggleColumnFilter = (column, event) => {
    event.stopPropagation(); // Prevent sort from triggering
    if (activeFilterColumn === column) {
      setActiveFilterColumn(null);
    } else {
      setActiveFilterColumn(column);
    }
  };

  const clearFilter = (column, event) => {
    event.stopPropagation(); // Prevent sort from triggering
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  };

  const executeSqlQuery = async () => {
    const query = sqlQueryRef.current.value.trim();
    
    if (!query) {
      setQueryError('Please enter a SQL query');
      return;
    }

    try {
      setIsExecutingQuery(true);
      setQueryError(null);
      
      // Send the SQL query to the backend for processing
      const response = await notebookApi.executeQuery(notebookId, query);
      setQueryResult(response);
      setIsExecutingQuery(false);
    } catch (err) {
      setQueryError(err.message || 'Failed to execute query');
      setIsExecutingQuery(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let processedData = [...data];

    // Apply filters
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue) {
        processedData = processedData.filter(row => {
          const cellValue = String(row[column] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      processedData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      });
    }

    return processedData;
  }, [data, sortConfig, filters]);

  const getSortIcons = (column) => {
    const isActive = sortConfig.key === column;
    const direction = sortConfig.direction;
    
    return (
      <div className="flex flex-col ml-1">
        <ChevronUpIcon 
          className={`h-3 w-3 ${isActive && direction === 'asc' ? 'text-teal-400' : 'text-gray-500'}`} 
        />
        <ChevronDownIcon 
          className={`h-3 w-3 ${isActive && direction === 'desc' ? 'text-teal-400' : 'text-gray-500'}`} 
        />
      </div>
    );
  };

  const displayData = queryResult ? queryResult.data : filteredAndSortedData;
  const displayColumns = queryResult ? queryResult.columns : columns;

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
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-medium text-gray-100">Data Preview</h2>
            <p className="text-sm text-gray-400 mt-1">Table: <span className="font-mono text-teal-400">{tableName}</span></p>
          </div>
          <button
            onClick={() => setShowAdvancedQuery(!showAdvancedQuery)}
            className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-gray-100 bg-gray-800 rounded-md"
          >
            <CodeBracketIcon className="h-4 w-4 mr-2" />
            {showAdvancedQuery ? 'Hide Advanced Query' : 'Advanced Query'}
          </button>
        </div>
        
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
          <>
            {showAdvancedQuery && (
              <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SQL Query
                  </label>
                  <div className="flex">
                    <textarea
                      ref={sqlQueryRef}
                      defaultValue=""
                      placeholder={`SELECT * FROM ${tableName} WHERE column = 'value' ORDER BY column ASC`}
                      className="flex-grow px-3 py-2 bg-gray-700 text-gray-100 rounded-l-md focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                      rows={3}
                    />
                    <button
                      onClick={executeSqlQuery}
                      disabled={isExecutingQuery}
                      className="px-4 py-2 bg-teal-600 text-white rounded-r-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center"
                    >
                      {isExecutingQuery ? (
                        <span>Executing...</span>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-2" />
                          <span>Execute</span>
                        </>
                      )}
                    </button>
                  </div>
                  {queryError && (
                    <p className="mt-2 text-sm text-red-400">{queryError}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Example queries:</p>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      <li>SELECT * FROM {tableName}</li>
                      <li>SELECT column1, column2 FROM {tableName}</li>
                      <li>SELECT * FROM {tableName} WHERE column = 'value'</li>
                      <li>SELECT * FROM {tableName} ORDER BY column ASC</li>
                    </ul>
                  </div>
                </div>
                
                {queryResult && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-300">Query Results</h3>
                      <button
                        onClick={() => setQueryResult(null)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-gray-700 rounded-md p-2 text-xs text-gray-300 font-mono overflow-x-auto">
                      {sqlQueryRef.current.value}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        {displayColumns.map((column) => (
                          <th
                            key={column}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-700 cursor-pointer hover:bg-gray-600 relative"
                            onClick={() => handleSort(column)}
                          >
                            <div className="flex items-center">
                              {column}
                              {getSortIcons(column)}
                              <button
                                onClick={(e) => toggleColumnFilter(column, e)}
                                className={`ml-2 p-1 rounded-full ${filters[column] ? 'text-teal-400 bg-gray-600' : 'text-gray-400 hover:text-gray-200'}`}
                              >
                                <FunnelIcon className="h-3 w-3" />
                              </button>
                            </div>
                            
                            {/* Column filter popup */}
                            {activeFilterColumn === column && (
                              <div 
                                ref={el => filterRefs.current[column] = el}
                                className="absolute z-10 mt-2 w-48 bg-gray-700 rounded-md shadow-lg p-3"
                                style={{ top: '100%', left: '0' }}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-medium text-gray-300">Filter {column}</span>
                                  {filters[column] && (
                                    <button 
                                      onClick={(e) => clearFilter(column, e)}
                                      className="text-gray-400 hover:text-gray-200"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={filters[column] || ''}
                                  onChange={(e) => handleFilterChange(column, e.target.value)}
                                  placeholder={`Filter ${column}...`}
                                  className="w-full px-2 py-1 text-xs bg-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  autoFocus
                                />
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {displayData.map((row, rowIndex) => (
                        <tr key={row.id || rowIndex} className="hover:bg-gray-700">
                          {displayColumns.map((column) => (
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
                Showing {displayData.length} of {total} rows
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Data; 