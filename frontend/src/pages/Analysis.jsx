import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { notebookApi } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Plot from 'react-plotly.js';

// Register ChartJS components for bar charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Chart options for bar charts
const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const label = context.dataset.label || '';
          const value = context.raw;
          return `${label}: ${value}`;
        },
        title: function(context) {
          if (context[0].dataset.data.length > 0) {
            const index = context[0].dataIndex;
            const originalValue = context[0].dataset.originalLabels?.[index] || context[0].label;
            return originalValue;
          }
          return context[0].label;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

export default function Analysis() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      setError(null);
      const report = await notebookApi.getAnalysisReport(notebookId);
      setAnalysisReport(report);
    } catch (err) {
      setError('Failed to generate analysis report');
      console.error('Error generating report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Helper function to truncate labels
  const truncateLabel = (label) => {
    if (typeof label === 'string' && label.length > 10) {
      return label.substring(0, 10) + '...';
    }
    return label;
  };

  // Prepare numeric stats for Plotly box plot
  const prepareNumericPlotData = (column, stats) => {
    const min = stats.min;
    const max = stats.max;
    const mean = stats.mean;
    const std = stats.std;
    
    // Approximate quartiles assuming normal distribution
    const q1 = mean - 0.675 * std;
    const q3 = mean + 0.675 * std;
    const median = mean;

    return {
      data: [{
        type: 'box',
        name: column,
        y: [min, q1, median, q3, max],
        boxpoints: false,
        marker: {
          color: 'rgb(75, 192, 192)'
        },
        line: {
          color: 'rgb(75, 192, 192)'
        }
      }],
      layout: {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          color: '#e5e7eb'
        },
        margin: {
          l: 50,
          r: 20,
          t: 20,
          b: 50
        },
        showlegend: false,
        yaxis: {
          gridcolor: '#374151',
          zerolinecolor: '#374151'
        },
        xaxis: {
          showgrid: false,
          zeroline: false
        }
      },
      config: {
        displayModeBar: false,
        responsive: true
      }
    };
  };

  // Prepare categorical stats chart data
  const prepareCategoricalChartData = (column, valueCounts) => {
    const sortedEntries = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    return {
      labels: sortedEntries.map(([value]) => truncateLabel(value)),
      datasets: [
        {
          label: column,
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          originalLabels: sortedEntries.map(([value]) => value),
        },
      ],
    };
  };

  // Prepare missing values chart data
  const prepareMissingValuesChartData = (missingValues) => {
    const entriesWithMissing = Object.entries(missingValues)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    
    return {
      labels: entriesWithMissing.map(([column]) => truncateLabel(column)),
      datasets: [
        {
          label: 'Missing Values',
          data: entriesWithMissing.map(([, count]) => count),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          originalLabels: entriesWithMissing.map(([column]) => column),
        },
      ],
    };
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
          <div className="flex items-center justify-between">
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
                <span className="ml-4">|</span>
                <span className="ml-4">
                  <Link to={`/analysis/${notebookId}`} className="text-gray-100">Analysis</Link>
                  <span className="mx-2 text-gray-600">|</span>
                  <Link 
                    to="/data" 
                    state={{ notebookId }} 
                    className="text-gray-400 hover:text-gray-200"
                  >
                    Data
                  </Link>
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {notebook && (
          <div>
            <h2 className="text-xl font-medium text-gray-100 mb-4">{notebook.title}</h2>
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className={`px-4 py-2 rounded-md mb-6 ${
                isGeneratingReport
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700'
              } text-white font-medium`}
            >
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
            {notebook.description && (
              <p className="text-gray-400 mb-6">{notebook.description}</p>
            )}
            
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            {analysisReport && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-100 mb-4">Dataset Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-gray-300">
                    <div>
                      <span className="font-medium">Total Rows:</span> {analysisReport.total_rows}
                    </div>
                    <div>
                      <span className="font-medium">Total Columns:</span> {analysisReport.total_columns}
                    </div>
                  </div>
                </div>

                {Object.keys(analysisReport.numeric_stats).length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-100 mb-4">Numeric Statistics</h3>
                    <div className="space-y-8">
                      {Object.entries(analysisReport.numeric_stats).map(([column, stats]) => {
                        const plotData = prepareNumericPlotData(column, stats);
                        return (
                          <div key={column} className="border-b border-gray-700 pb-6 last:border-0">
                            <h4 className="text-gray-200 font-medium mb-4">{column}</h4>
                            <div className="h-64">
                              <Plot 
                                data={plotData.data}
                                layout={plotData.layout}
                                config={plotData.config}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300 text-sm">
                              <div>
                                <span className="font-medium">Min:</span> {stats.min.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Max:</span> {stats.max.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Mean:</span> {stats.mean.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Std Dev:</span> {stats.std.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(analysisReport.categorical_stats).length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-100 mb-4">Categorical Statistics</h3>
                    <div className="space-y-8">
                      {Object.entries(analysisReport.categorical_stats).map(([column, valueCounts]) => (
                        <div key={column} className="border-b border-gray-700 pb-6 last:border-0">
                          <h4 className="text-gray-200 font-medium mb-4">{column}</h4>
                          <div className="h-64">
                            <Bar 
                              options={chartOptions} 
                              data={prepareCategoricalChartData(column, valueCounts)} 
                            />
                          </div>
                          {Object.keys(valueCounts).length > 10 && (
                            <div className="text-gray-400 italic mt-2">
                              Showing top 10 of {Object.keys(valueCounts).length} values
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(analysisReport.missing_values).length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-100 mb-4">Missing Values</h3>
                    <div className="h-64 mb-4">
                      <Bar 
                        options={chartOptions} 
                        data={prepareMissingValuesChartData(analysisReport.missing_values)} 
                      />
                    </div>
                    <div className="text-gray-400 italic">
                      Only showing columns with missing values
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 