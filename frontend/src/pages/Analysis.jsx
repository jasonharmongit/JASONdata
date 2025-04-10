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
      console.log('Starting report generation for notebook:', notebookId);

      const report = await notebookApi.getAnalysisReport(notebookId);
      console.log('Received analysis report:', report);

      // Validate the report structure
      if (!report) {
        throw new Error('Received empty report from server');
      }

      // Check required top-level properties
      const requiredProperties = ['numeric_stats', 'categorical_stats', 'missing_values', 'total_rows', 'total_columns', 'numeric_distributions'];
      const missingProperties = requiredProperties.filter(prop => !(prop in report));
      
      if (missingProperties.length > 0) {
        throw new Error(`Report is missing required properties: ${missingProperties.join(', ')}`);
      }

      // Validate numeric distributions if we have numeric stats
      if (Object.keys(report.numeric_stats).length > 0) {
        Object.entries(report.numeric_stats).forEach(([column, stats]) => {
          if (!report.numeric_distributions[column]) {
            console.warn(`Column ${column} has numeric stats but no distribution data`);
          }
          
          const distribution = report.numeric_distributions[column];
          if (distribution) {
            // Validate histogram data
            if (!distribution.histogram?.counts || !distribution.histogram?.bin_edges) {
              console.warn(`Column ${column} is missing histogram data`);
            }
            // Validate boxplot data
            if (!distribution.boxplot?.whisker_min || !distribution.boxplot?.q1 || 
                !distribution.boxplot?.median || !distribution.boxplot?.q3 || 
                !distribution.boxplot?.whisker_max) {
              console.warn(`Column ${column} is missing boxplot data`);
            }
          }
        });
      }

      console.log('Report validation passed. Setting analysis report state.');
      setAnalysisReport(report);
      console.log('Analysis report state updated.');

    } catch (err) {
      console.error('Error in handleGenerateReport:', err);
      let errorMessage = 'Failed to generate analysis report';
      
      // Add more context to the error message
      if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      // If it's a network error, add more details
      if (err.response) {
        console.error('Server response:', err.response);
        errorMessage += ` (Status: ${err.response.status})`;
        if (err.response.data?.detail) {
          errorMessage += ` - ${err.response.data.detail}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsGeneratingReport(false);
      console.log('Report generation completed');
    }
  };

  // Add a debug effect to log state changes
  useEffect(() => {
    if (analysisReport) {
      console.log('Analysis report state updated:', {
        numericColumns: Object.keys(analysisReport.numeric_stats).length,
        categoricalColumns: Object.keys(analysisReport.categorical_stats).length,
        distributions: Object.keys(analysisReport.numeric_distributions).length
      });
    }
  }, [analysisReport]);

  // Helper function to truncate labels
  const truncateLabel = (label) => {
    if (typeof label === 'string' && label.length > 10) {
      return label.substring(0, 10) + '...';
    }
    return label;
  };

  // Prepare numeric stats for Plotly box plot
  const prepareNumericPlotData = (column, stats) => {
    const distributions = analysisReport.numeric_distributions[column];
    const boxplot = distributions.boxplot;
    const histogram = distributions.histogram;

    // Calculate the plot range with padding
    const range = [
      boxplot.whisker_min - (boxplot.whisker_max - boxplot.whisker_min) * 0.05,
      boxplot.whisker_max + (boxplot.whisker_max - boxplot.whisker_min) * 0.05
    ];

    return {
      data: [
        {
          type: 'box',
          x: [boxplot.whisker_min, boxplot.q1, boxplot.median, boxplot.q3, boxplot.whisker_max],
          name: column,
          orientation: 'h',
          boxpoints: false,
          marker: { color: 'rgb(75, 192, 192)' },
          line: { 
            color: 'rgb(75, 192, 192)',
            width: 2
          },
          fillcolor: 'rgba(75, 192, 192, 0.8)',
          hoverinfo: 'x',
          showlegend: false,
          xaxis: 'x1',
          yaxis: 'y1'
        },
        {
          type: 'bar',
          x: histogram.bin_edges.slice(0, -1),
          y: histogram.counts,
          name: 'Distribution',
          marker: { 
            color: 'rgba(75, 192, 192, 0.6)',
            line: {
              color: 'rgb(75, 192, 192)',
              width: 1
            }
          },
          width: histogram.bin_edges.map((edge, i) => 
            i < histogram.bin_edges.length - 1 ? histogram.bin_edges[i + 1] - edge : 0
          ),
          showlegend: false,
          xaxis: 'x2',
          yaxis: 'y2'
        }
      ],
      layout: {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e5e7eb' },
        margin: { l: 40, r: 20, t: 10, b: 40 },
        height: 400,
        autosize: true,
        grid: {
          rows: 2,
          columns: 1,
          pattern: 'independent',
          roworder: 'top to bottom'
        },
        // Common settings for both x-axes
        xaxis1: {  // Boxplot x-axis
          showticklabels: false,
          showgrid: true,
          zeroline: true,
          gridcolor: '#374151',
          zerolinecolor: '#374151',
          range: range,
          domain: [0.1, 0.9]  // Consistent domain for both plots
        },
        xaxis2: {  // Histogram x-axis
          title: {
            text: column,
            standoff: 10
          },
          showticklabels: true,
          showgrid: true,
          zeroline: true,
          gridcolor: '#374151',
          zerolinecolor: '#374151',
          range: range,
          domain: [0.1, 0.9]  // Consistent domain for both plots
        },
        yaxis1: {  // Boxplot y-axis
          showgrid: false,
          zeroline: false,
          showticklabels: false,
          domain: [0.75, 0.9],
          fixedrange: true
        },
        yaxis2: {  // Histogram y-axis
          gridcolor: '#374151',
          zerolinecolor: '#374151',
          showticklabels: true,
          title: {
            text: 'Count',
            standoff: 10
          },
          domain: [0.2, 0.65],
          fixedrange: true
        }
      },
      config: {
        displayModeBar: false,
        responsive: true,
        staticPlot: true
      }
    };
  };

  // Prepare categorical stats chart data
  const prepareCategoricalChartData = (column, valueCounts) => {
    // Convert the object to array and sort by count
    const sortedEntries = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a);
    
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
                            <h4 className="text-gray-200 font-medium mb-2">{column}</h4>
                            <div className="space-y-1 text-sm text-gray-400 mb-4">
                              <div><span className="font-medium text-gray-300">Min:</span> {stats.min.toFixed(2)}</div>
                              <div><span className="font-medium text-gray-300">Max:</span> {stats.max.toFixed(2)}</div>
                              <div><span className="font-medium text-gray-300">Mean:</span> {stats.mean.toFixed(2)}</div>
                              <div><span className="font-medium text-gray-300">Std Dev:</span> {stats.std.toFixed(2)}</div>
                            </div>
                            <div className="w-full h-[400px] relative">
                              <Plot 
                                data={plotData.data}
                                layout={plotData.layout}
                                config={plotData.config}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler={true}
                              />
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