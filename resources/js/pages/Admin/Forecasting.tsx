import AppLayout from '@/layouts/app-layout';
import { LineChart, BarChart2, TrendingUp, Calendar, Filter, Download, RefreshCw, PlusCircle, Brain, Zap, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Area, PieChart, Pie, Cell } from 'recharts';

interface ForecastData {
    month: string;
    actual?: number;
    forecast?: number;
    confidence?: number;
    type: 'historical' | 'ai_forecast' | 'statistical_forecast';
}

interface InventoryForecast {
    id: number;
    product_name: string;
    sku: string;
    batch_number: string;
    category_name: string;
    current_stock: number;
    minimum_stock: number;
    avg_monthly_demand: number;
    recent_monthly_demand: number;
    predicted_demand: number;
    recommended_stock: number;
    growth_rate: number;
    reorder_point: number;
    seasonal_trend: 'hot' | 'rising' | 'stable' | 'declining' | 'cold';
    performance_score: number;
    is_trending: boolean;
    season: string;
}

interface SeasonalPattern {
    category: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    peak_quarter: string;
}

interface ProductSeasonalPattern {
    product_id: number;
    product_name: string;
    sku: string;
    batch_number: string;
    category_name: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    peak_quarter: string;
    peak_value: number;
    current_quarter: string;
    current_quarter_value: number;
    seasonal_strength: 'very_strong' | 'strong' | 'average' | 'weak';
    avg_quarterly_sales: number;
    total_annual: number;
    next_quarter_prediction: number;
    is_peak_season: boolean;
    q1_change: number;
    q2_change: number;
    q3_change: number;
    q4_change: number;
}

interface BusinessInsight {
    performance_metrics: {
        revenue_growth: number;
        inventory_turnover: number;
        profit_margin: number;
        customer_retention: number;
    };
    opportunities: Array<{
        area: string;
        description: string;
        potential_impact: string;
    }>;
    risks: Array<{
        risk: string;
        categories: string[];
        mitigation: string;
    }>;
    strategic_recommendations: string[];
    market_trends: string[];
}

interface ForecastOverview {
    forecast_summary: {
        monthly_projected_revenue: number;
        growth_prediction: number;
        forecast_accuracy: number;
        active_forecasts: number;
    };
    recent_predictions: Array<{
        type: string;
        period: string;
        accuracy: string;
        generated_at: string;
    }>;
    trending_categories: Array<{
        category: string;
        trend: string;
        change: string;
    }>;
    ai_status: {
        connection: string;
        last_training: string;
        models_available: string[];
    };
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SalesForecastingPage() {
    const [timeRange, setTimeRange] = useState('12 months');
    const [forecastType, setForecastType] = useState('Sales');
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [overview, setOverview] = useState<ForecastOverview | null>(null);
    const [salesForecast, setSalesForecast] = useState<ForecastData[]>([]);
    const [inventoryForecast, setInventoryForecast] = useState<InventoryForecast[]>([]);
    const [seasonalTrends, setSeasonalTrends] = useState<SeasonalPattern[]>([]);
    const [productSeasonalTrends, setProductSeasonalTrends] = useState<ProductSeasonalPattern[]>([]);
    const [businessInsights, setBusinessInsights] = useState<BusinessInsight | null>(null);
    const [accuracyData, setAccuracyData] = useState<any[]>([]);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<string[]>([]);

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // API functions
    const fetchOverview = async () => {
        try {
            const response = await fetch('/api/forecasting/overview', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setOverview(data.data);
            }
        } catch (error) {
            console.error('Error fetching overview:', error);
        }
    };

    const fetchSalesForecast = async () => {
        setAiLoading(true);
        try {
            const months = timeRange === '3 months' ? 3 : timeRange === '6 months' ? 6 : timeRange === '24 months' ? 24 : 12;
            
            const response = await fetch(`/api/forecasting/sales?months=${months}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setSalesForecast(data.data.forecast_data || []);
                setAiInsights(data.data.ai_insights || []);
                setRecommendations(data.data.recommendations || []);
                showNotification('success', 'Sales forecast generated successfully');
            } else {
                throw new Error('Failed to fetch sales forecast');
            }
        } catch (error) {
            console.error('Error fetching sales forecast:', error);
            showNotification('error', 'Failed to generate sales forecast');
        } finally {
            setAiLoading(false);
        }
    };

    const fetchInventoryForecast = async () => {
        setAiLoading(true);
        try {
            const response = await fetch('/api/forecasting/inventory', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setInventoryForecast(data.data.demand_forecast || []);
                showNotification('success', 'Inventory forecast generated successfully');
            } else {
                throw new Error('Failed to fetch inventory forecast');
            }
        } catch (error) {
            console.error('Error fetching inventory forecast:', error);
            showNotification('error', 'Failed to generate inventory forecast');
        } finally {
            setAiLoading(false);
        }
    };

    const fetchSeasonalTrends = async () => {
        setAiLoading(true);
        try {
            const response = await fetch('/api/forecasting/seasonal', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setSeasonalTrends(data.data.seasonal_patterns || []);
                setProductSeasonalTrends(data.data.product_seasonal_patterns || []);
                showNotification('success', 'Seasonal trends analysis completed');
            } else {
                throw new Error('Failed to fetch seasonal trends');
            }
        } catch (error) {
            console.error('Error fetching seasonal trends:', error);
            showNotification('error', 'Failed to generate seasonal trends');
        } finally {
            setAiLoading(false);
        }
    };

    const fetchBusinessInsights = async () => {
        setAiLoading(true);
        try {
            const response = await fetch('/api/forecasting/insights', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setBusinessInsights(data.data);
                showNotification('success', 'Business insights generated successfully');
            } else {
                throw new Error('Failed to fetch business insights');
            }
        } catch (error) {
            console.error('Error fetching business insights:', error);
            showNotification('error', 'Failed to generate business insights');
        } finally {
            setAiLoading(false);
        }
    };

    const fetchAccuracyData = async () => {
        try {
            const response = await fetch('/api/forecasting/accuracy', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setAccuracyData(data.data.monthly_accuracy || []);
            }
        } catch (error) {
            console.error('Error fetching accuracy data:', error);
        }
    };

    const testAIConnection = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/forecasting/test-ai', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            const data = await response.json();
            
            if (data.success) {
                showNotification('success', 'AI connection successful');
            } else {
                showNotification('error', data.message || 'AI connection failed');
            }
        } catch (error) {
            showNotification('error', 'Failed to test AI connection');
        } finally {
            setLoading(false);
        }
    };

    const generateForecast = async () => {
        switch (forecastType) {
            case 'Sales':
                await fetchSalesForecast();
                break;
            case 'Inventory':
                await fetchInventoryForecast();
                break;
            case 'Seasonal':
                await fetchSeasonalTrends();
                break;
            case 'Insights':
                await fetchBusinessInsights();
                break;
        }
    };

    const exportForecast = async () => {
        try {
            generatePDF();
            showNotification('success', 'Forecast PDF exported successfully');
        } catch (error) {
            showNotification('error', 'Failed to export forecast');
        }
    };

    const generatePDF = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Determine which data to use based on forecastType
        let forecastData: any[] = [];
        let reportTitle = '';
        let dataType = '';
        
        switch (forecastType) {
            case 'Sales':
                forecastData = salesForecast;
                reportTitle = 'SALES FORECAST REPORT';
                dataType = 'sales';
                break;
            case 'Inventory':
                forecastData = inventoryForecast;
                reportTitle = 'INVENTORY DEMAND FORECAST REPORT';
                dataType = 'inventory';
                break;
            case 'Seasonal':
                forecastData = seasonalTrends;
                reportTitle = 'SEASONAL TRENDS REPORT';
                dataType = 'seasonal';
                break;
            case 'Insights':
                forecastData = businessInsights ? [businessInsights] : [];
                reportTitle = 'BUSINESS INSIGHTS REPORT';
                dataType = 'insights';
                break;
            default:
                forecastData = salesForecast;
                reportTitle = 'FORECAST REPORT';
                dataType = 'sales';
        }


        const currentUser = 'Admin';
        
        const dateRangeText = dateFrom && dateTo 
            ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`
            : dateFrom 
            ? `From ${new Date(dateFrom).toLocaleDateString()}`
            : dateTo 
            ? `Until ${new Date(dateTo).toLocaleDateString()}`
            : 'All Time';

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
            <html>
                <head>
                <title>${reportTitle}</title>
                <style>
                    @page {
                        size: A4 ${dataType === 'seasonal' ? 'landscape' : 'portrait'};
                        margin: 20mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 10pt;
                        line-height: 1.4;
                        color: #333;
                    }
                    
                    .page {
                        position: relative;
                        min-height: 100vh;
                        padding-bottom: 80px;
                    }
                    
                    .header {
                        text-align: center;
                        padding: 20px 0;
                        border-bottom: 3px solid #dc2626;
                        margin-bottom: 20px;
                    }
                    

                    .company-name {
                        color: #333;
                        font-size: 28pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .header h1 {
                        color: #333;
                        font-size: 24pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .header .subtitle {
                        color: #666;
                        font-size: 11pt;
                        margin-bottom: 10px;
                    }
                    
                    .header .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    .summary {
                        background: #dcfce7;
                        border: 2px solid #dc2626;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                    }
                    
                    .summary-item {
                        text-align: center;
                    }
                    
                    .summary-item .label {
                        font-size: 9pt;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    
                    .summary-item .value {
                        font-size: 18pt;
                        font-weight: bold;
                        color: #dc2626;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    
                    thead {
                        background: #dc2626;
                        color: white;
                    }
                    
                    th {
                        padding: 10px 8px;
                        text-align: left;
                        font-size: 9pt;
                        font-weight: bold;
                        border: 1px solid #dc2626;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 9pt;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #f9fafb;
                    }
                    
                    .no-data {
                        text-align: center;
                        padding: 40px;
                        color: #666;
                        font-style: italic;
                    }
                    
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 15px 20mm;
                        border-top: 2px solid #dc2626;
                        background: white;
                        font-size: 8pt;
                        color: #666;
                    }
                    
                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .footer strong {
                        color: #dc2626;
                    }
                    
                    .trend-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 8pt;
                        font-weight: bold;
                    }
                    
                    .trend-up {
                        background: #dcfce7;
                        color: #dc2626;
                    }
                    
                    .trend-down {
                        background: #fee2e2;
                        color: #991b1b;
                    }
                    
                    .trend-stable {
                        background: #dbeafe;
                        color: #1e3a8a;
                    }
                    
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="company-name">H2-MED Enterprises</div>
                        <h1>${reportTitle}</h1>
                        <div class="subtitle">Demand forecasting and trend analysis</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> ${dateRangeText}</div>
                            <div><strong>Generated by:</strong> ${currentUser}</div>
                        </div>
                    </div>
                    
                    ${overview && overview.forecast_summary ? `
                        <div class="summary">
                            <div class="summary-item">
                                <div class="label">Monthly Projected Revenue</div>
                                <div class="value">₱${overview.forecast_summary.monthly_projected_revenue?.toLocaleString() || '0'}</div>
                            </div>
                            <div class="summary-item">
                                <div class="label">Growth Prediction</div>
                                <div class="value">${overview.forecast_summary.growth_prediction ? (overview.forecast_summary.growth_prediction > 0 ? '+' : '') + overview.forecast_summary.growth_prediction.toFixed(1) + '%' : 'N/A'}</div>
                            </div>
                            <div class="summary-item">
                                <div class="label">Forecast Accuracy</div>
                                <div class="value">${overview.forecast_summary.forecast_accuracy ? overview.forecast_summary.forecast_accuracy.toFixed(1) + '%' : 'N/A'}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${forecastData.length > 0 ? (
                        dataType === 'inventory' ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%;">#</th>
                                        <th style="width: 25%;">Category</th>
                                        <th style="width: 12%;">Current Stock</th>
                                        <th style="width: 15%;">Predicted Demand</th>
                                        <th style="width: 15%;">Recommended Stock</th>
                                        <th style="width: 12%;">Growth Rate</th>
                                        <th style="width: 16%;">Reorder Point</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${forecastData.map((item: any, index: number) => `
                                        <tr>
                                            <td style="text-align: center;">${index + 1}</td>
                                            <td><strong>${item.category_name || 'Unknown'}</strong></td>
                                            <td style="text-align: right;">${item.current_stock?.toLocaleString() || 0}</td>
                                            <td style="text-align: right;">${item.predicted_demand?.toLocaleString() || 0}</td>
                                            <td style="text-align: right;">${item.recommended_stock?.toLocaleString() || 0}</td>
                                            <td style="text-align: center;">${item.growth_rate ? (item.growth_rate > 0 ? '+' : '') + item.growth_rate.toFixed(1) + '%' : 'N/A'}</td>
                                            <td style="text-align: right;">${item.reorder_point?.toLocaleString() || 0}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : dataType === 'seasonal' ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%;">#</th>
                                        <th style="width: 30%;">Category</th>
                                        <th style="width: 12%;">Q1</th>
                                        <th style="width: 12%;">Q2</th>
                                        <th style="width: 12%;">Q3</th>
                                        <th style="width: 12%;">Q4</th>
                                        <th style="width: 17%;">Peak Quarter</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${forecastData.map((pattern: any, index: number) => `
                                        <tr>
                                            <td style="text-align: center;">${index + 1}</td>
                                            <td><strong>${pattern.category || 'Unknown'}</strong></td>
                                            <td style="text-align: right;">${pattern.q1?.toLocaleString() || 0}</td>
                                            <td style="text-align: right;">${pattern.q2?.toLocaleString() || 0}</td>
                                            <td style="text-align: right;">${pattern.q3?.toLocaleString() || 0}</td>
                                            <td style="text-align: right;">${pattern.q4?.toLocaleString() || 0}</td>
                                            <td style="text-align: center;">${pattern.peak_quarter || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : dataType === 'sales' ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%;">#</th>
                                        <th style="width: 20%;">Month</th>
                                        <th style="width: 20%;">Actual Sales</th>
                                        <th style="width: 20%;">Forecast</th>
                                        <th style="width: 15%;">Confidence</th>
                                        <th style="width: 20%;">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${forecastData.map((data: any, index: number) => `
                                        <tr>
                                            <td style="text-align: center;">${index + 1}</td>
                                            <td><strong>${data.month || 'Unknown'}</strong></td>
                                            <td style="text-align: right;">${data.actual ? '₱' + data.actual.toLocaleString() : '-'}</td>
                                            <td style="text-align: right;">${data.forecast ? '₱' + data.forecast.toLocaleString() : '-'}</td>
                                            <td style="text-align: center;">${data.confidence ? data.confidence.toFixed(1) + '%' : 'N/A'}</td>
                                            <td style="font-size: 7pt; text-transform: capitalize;">${data.type ? data.type.replace('_', ' ') : 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : dataType === 'insights' && businessInsights ? `
                            <div style="padding: 20px;">
                                <div style="margin-bottom: 30px;">
                                    <h3 style="color: #00c951; margin-bottom: 15px;">Performance Metrics</h3>
                                    <table style="font-size: 9pt;">
                                        <tbody>
                                            <tr>
                                                <td style="padding: 8px; background: #f9fafb;"><strong>Revenue Growth:</strong></td>
                                                <td style="padding: 8px;">${businessInsights.performance_metrics?.revenue_growth ? businessInsights.performance_metrics.revenue_growth.toFixed(1) + '%' : 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px; background: #f9fafb;"><strong>Inventory Turnover:</strong></td>
                                                <td style="padding: 8px;">${businessInsights.performance_metrics?.inventory_turnover ? businessInsights.performance_metrics.inventory_turnover.toFixed(2) : 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px; background: #f9fafb;"><strong>Profit Margin:</strong></td>
                                                <td style="padding: 8px;">${businessInsights.performance_metrics?.profit_margin ? businessInsights.performance_metrics.profit_margin.toFixed(1) + '%' : 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px; background: #f9fafb;"><strong>Customer Retention:</strong></td>
                                                <td style="padding: 8px;">${businessInsights.performance_metrics?.customer_retention ? businessInsights.performance_metrics.customer_retention.toFixed(1) + '%' : 'N/A'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div style="margin-bottom: 30px;">
                                    <h3 style="color: #00c951; margin-bottom: 10px;">Strategic Recommendations</h3>
                                    <ul style="margin-left: 20px; font-size: 9pt;">
                                        ${businessInsights.strategic_recommendations?.map((rec: string) => `<li style="margin-bottom: 8px;">${rec}</li>`).join('') || '<li>No recommendations available</li>'}
                                    </ul>
                                </div>
                                
                                ${businessInsights.opportunities && businessInsights.opportunities.length > 0 ? `
                                    <div style="margin-bottom: 30px;">
                                        <h3 style="color: #00c951; margin-bottom: 10px;">Opportunities</h3>
                                        ${businessInsights.opportunities.map((opp: any) => `
                                            <div style="margin-bottom: 15px; padding: 10px; background: #dcfce7; border-radius: 5px;">
                                                <strong style="color: #166534;">${opp.area}:</strong> ${opp.description}
                                                <div style="font-size: 8pt; color: #666; margin-top: 5px;">Impact: ${opp.potential_impact}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                ${businessInsights.risks && businessInsights.risks.length > 0 ? `
                                    <div>
                                        <h3 style="color: #dc2626; margin-bottom: 10px;">Risks & Mitigation</h3>
                                        ${businessInsights.risks.map((risk: any) => `
                                            <div style="margin-bottom: 15px; padding: 10px; background: #fee2e2; border-radius: 5px;">
                                                <strong style="color: #991b1b;">${risk.risk}</strong>
                                                <div style="font-size: 8pt; color: #666; margin-top: 5px;">Categories: ${risk.categories?.join(', ') || 'All'}</div>
                                                <div style="font-size: 8pt; margin-top: 5px;"><strong>Mitigation:</strong> ${risk.mitigation}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="no-data">
                                <p>✓ No forecast data available</p>
                                <p>Please generate a forecast to view data</p>
                            </div>
                        `
                    ) : `
                        <div class="no-data">
                            <p>✓ No forecast data available</p>
                        </div>
                    `}
                    
                    <div class="footer">
                        <div class="footer-content">
                            <div class="footer-left">
                                <div><strong>Pharmacy Inventory System</strong></div>
                                <div>Generated on: ${new Date().toLocaleString('en-US')}</div>
                            </div>
                            <div class="footer-right">
                                <div><strong>CONFIDENTIAL</strong></div>
                                <div>Page 1 of 1</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // Effects
    useEffect(() => {
        fetchOverview();
        fetchAccuracyData();
        fetchSalesForecast(); // Load initial forecast
    }, []);

    useEffect(() => {
        if (forecastType === 'Sales') {
            fetchSalesForecast();
        }
    }, [timeRange]);

    // Notification Component
    const Notification = () => {
        if (!notification) return null;

        const bgColor = notification.type === 'success' 
            ? 'bg-green-500' 
            : notification.type === 'error'
            ? 'bg-red-500'
            : 'bg-blue-500';
        
        return (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
                <div className={`${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm`}>
                    <div className="flex items-center justify-between">
                        <div className="font-medium">{notification.message}</div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <AppLayout>
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Brain className="h-8 w-8 text-blue-600 mr-3" />
                            AI-Powered Sales Forecasting
                        </h1>
                        <p className="text-gray-500">Predict future sales and inventory needs</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={exportForecast}
                            className="flex items-center gap-1 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                     { /*  <button 
                            onClick={testAIConnection}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Zap className="h-4 w-4" />
                            Test AI
                        </button>*/}
                        <button 
                            onClick={generateForecast}
                            disabled={aiLoading}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <PlusCircle className="h-4 w-4" />
                                    Generate AI Forecast
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border shadow p-4">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 text-blue-500">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Monthly Projected Revenue</p>
                                <p className="text-2xl font-semibold text-gray-800">
                                    {overview ? formatCurrency(overview.forecast_summary.monthly_projected_revenue) : '₱480,000'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow p-4">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-100 text-green-500">
                                <LineChart className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Growth Prediction</p>
                                <p className="text-2xl font-semibold text-gray-800">
                                    +{overview?.forecast_summary.growth_prediction || 12}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow p-4">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-purple-100 text-purple-500">
                                <Target className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Forecast Accuracy</p>
                                <p className="text-2xl font-semibold text-gray-800">
                                    {overview?.forecast_summary.forecast_accuracy || 96}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow p-4">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-yellow-100 text-yellow-500">
                                <Brain className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">AI Status</p>
                                <p className="text-2xl font-semibold text-gray-800 flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 ${overview?.ai_status.connection === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {overview?.ai_status.connection === 'active' ? 'Connected' : 'Offline'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights and Recommendations */}
                {(aiInsights.length > 0 || recommendations.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {aiInsights.length > 0 && (
                            <div className="bg-white rounded-xl border shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <Brain className="h-5 w-5 text-blue-600 mr-2" />
                                    AI Insights
                                </h3>
                                <div className="space-y-3">
                                    {aiInsights.map((insight, index) => (
                                        <div key={index} className="flex items-start space-x-3">
                                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recommendations.length > 0 && (
                            <div className="bg-white rounded-xl border shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <Target className="h-5 w-5 text-orange-600 mr-2" />
                                    Recommendations
                                </h3>
                                <div className="space-y-3">
                                    {recommendations.map((recommendation, index) => (
                                        <div key={index} className="flex items-start space-x-3">
                                            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700">{recommendation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-4 bg-white rounded-xl border shadow p-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <select 
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                            value={forecastType}
                            onChange={(e) => setForecastType(e.target.value)}
                        >
                            <option value="Sales">Sales Forecast</option>
                            <option value="Inventory">Inventory Demand</option>
                            <option value="Seasonal">Seasonal Trends</option>
                            <option value="Insights">Business Insights</option>
                        </select>
                    </div>
                    {forecastType === 'Sales' && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            <select 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <option value="3 months">Next 3 Months</option>
                                <option value="6 months">Next 6 Months</option>
                                <option value="12 months">Next 12 Months</option>
                                <option value="24 months">Next 24 Months</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Main Chart */}
                    <div className="lg:col-span-3 rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">
                                {forecastType === 'Sales' && 'AI Sales Forecast'}
                                {forecastType === 'Inventory' && 'Inventory Demand Forecast'}
                                {forecastType === 'Seasonal' && 'Seasonal Trends Analysis'}
                                {forecastType === 'Insights' && 'Business Performance Insights'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {forecastType === 'Sales' && `Projected revenue for the next ${timeRange}`}
                                {forecastType === 'Inventory' && 'Predicted demand by category'}
                                {forecastType === 'Seasonal' && 'Quarterly demand patterns'}
                                {forecastType === 'Insights' && 'AI-generated business analysis'}
                            </p>
                        </div>
                        <div className="p-4 h-80">
                            {aiLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Generating AI forecast...</p>
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    {forecastType === 'Sales' && (
                                        <ComposedChart data={salesForecast} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis 
                                                tickFormatter={(value) => formatCurrency(value).replace('₱', '')}
                                            />
                                            <Tooltip 
                                                formatter={(value) => [formatCurrency(value as number), 'Amount']}
                                                labelFormatter={(label) => `Month: ${label}`}
                                            />
                                            <Legend />
                                            <Area 
                                                type="monotone" 
                                                dataKey="forecast" 
                                                fill="#bbdefb" 
                                                stroke="#2196f3" 
                                                name="AI Forecast" 
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="actual" 
                                                stroke="#4caf50" 
                                                strokeWidth={2}
                                                name="Actual Sales" 
                                            />
                                        </ComposedChart>
                                    )}
                                    
                                    {forecastType === 'Inventory' && (
                                        <BarChart data={inventoryForecast} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="category_name" angle={-45} textAnchor="end" height={100} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="current_stock" name="Current Stock" fill="#8884d8" />
                                            <Bar dataKey="predicted_demand" name="Predicted Demand" fill="#82ca9d" />
                                            <Bar dataKey="recommended_stock" name="Recommended Stock" fill="#ffc658" />
                                        </BarChart>
                                    )}
                                    
                                    {forecastType === 'Seasonal' && (
                                        <div className="h-full overflow-y-auto">
                                            {/* Category-Level Chart */}
                                            {seasonalTrends.length > 0 && (
                                                <div className="mb-6">
                                                    <h4 className="font-semibold text-gray-700 mb-3">Category Seasonal Patterns</h4>
                                                    <ResponsiveContainer width="100%" height={250}>
                                                        <BarChart data={seasonalTrends} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="category" type="category" scale="band" width={80} />
                                                            <Tooltip />
                                                            <Legend verticalAlign="top" align="center" wrapperStyle={{ lineHeight: '20px' }} />
                                                            <Bar dataKey="q1" name="Q1" fill="#bbdefb" />
                                                            <Bar dataKey="q2" name="Q2" fill="#90caf9" />
                                                            <Bar dataKey="q3" name="Q3" fill="#64b5f6" />
                                                            <Bar dataKey="q4" name="Q4" fill="#2196f3" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                            
                                            {/* No Data Message */}
                                            {seasonalTrends.length === 0 && productSeasonalTrends.length === 0 && !aiLoading && (
                                                <div className="flex flex-col items-center justify-center h-full text-center">
                                                    <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                                                    <p className="text-gray-500 mb-2">No seasonal data available</p>
                                                    <p className="text-sm text-gray-400">Click "Generate AI Forecast" to analyze seasonal trends</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {forecastType === 'Insights' && businessInsights && (
                                        <div className="grid grid-cols-2 gap-6 h-full">
                                            <div>
                                                <h4 className="font-semibold mb-4">Performance Metrics</h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span>Revenue Growth:</span>
                                                        <span className="font-medium text-green-600">
                                                            {(businessInsights.performance_metrics.revenue_growth * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Inventory Turnover:</span>
                                                        <span className="font-medium">
                                                            {businessInsights.performance_metrics.inventory_turnover.toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Profit Margin:</span>
                                                        <span className="font-medium">
                                                            {(businessInsights.performance_metrics.profit_margin * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-4">Opportunities</h4>
                                                <div className="space-y-2">
                                                    {businessInsights.opportunities.slice(0, 3).map((opp, index) => (
                                                        <div key={index} className="p-2 bg-green-50 rounded">
                                                            <p className="text-sm font-medium">{opp.area}</p>
                                                            <p className="text-xs text-gray-600">{opp.potential_impact}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Widgets */}
                    <div className="space-y-4">
                        {/* Forecast Accuracy Widget */}
                        <div className="rounded-xl border bg-white shadow">
                            <div className="p-4 border-b bg-blue-50">
                                <h3 className="text-lg font-medium text-blue-800 flex items-center">
                                    <LineChart className="h-5 w-5 mr-2" />
                                    Forecast Accuracy
                                </h3>
                            </div>
                            <div className="p-4">
                                <ul className="divide-y divide-gray-200">
                                    {accuracyData.slice(0, 5).map((item, index) => (
                                        <li key={index} className="py-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.month}</p>
                                                    <p className="text-xs text-gray-500">AI Prediction</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-green-600">
                                                        {item.accuracy}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* AI Status Widget */}
                        <div className="rounded-xl border bg-white shadow">
                            <div className="p-4 border-b">
                                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                                    <Brain className="h-5 w-5 mr-2" />
                                    AI Models
                                </h3>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    {overview?.ai_status.models_available.map((model, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 capitalize">
                                                {model.replace('_', ' ')}
                                            </span>
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-gray-500">
                                        Last Training: {overview?.ai_status.last_training ? 
                                            new Date(overview.ai_status.last_training).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Predictions Widget */}
                        {overview?.recent_predictions && (
                            <div className="rounded-xl border bg-white shadow">
                                <div className="p-4 border-b">
                                    <h3 className="text-lg font-medium text-gray-800">Recent Predictions</h3>
                                </div>
                                <div className="p-4">
                                    <div className="space-y-3">
                                        {overview.recent_predictions.map((prediction, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{prediction.type}</p>
                                                    <p className="text-xs text-gray-500">{prediction.period}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-green-600">{prediction.accuracy}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(prediction.generated_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section - Inventory Demand Forecast */}
                {forecastType === 'Inventory' && inventoryForecast.length > 0 && (
                    <div className="relative rounded-xl border bg-white shadow">
                        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                🔥 Seasonal Product Performance & Demand Forecast
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Real-time analysis showing which products are <span className="font-semibold text-red-600">"kusog"</span> (hot sellers) 
                                this season by category and product
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span className="text-gray-600">🔥 Hot (Very High Demand)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <span className="text-gray-600">📈 Rising (Growing)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    <span className="text-gray-600">➡️ Stable</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                    <span className="text-gray-600">📉 Declining</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                    <span className="text-gray-600">❄️ Cold (Low Demand)</span>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seasonal Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Demand</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Needed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {inventoryForecast.map((item, index) => {
                                        const trendColors = {
                                            hot: 'bg-red-100 text-red-800 border-red-300',
                                            rising: 'bg-orange-100 text-orange-800 border-orange-300',
                                            stable: 'bg-blue-100 text-blue-800 border-blue-300',
                                            declining: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                                            cold: 'bg-gray-100 text-gray-800 border-gray-300'
                                        };
                                        
                                        const trendIcons = {
                                            hot: '🔥',
                                            rising: '📈',
                                            stable: '➡️',
                                            declining: '📉',
                                            cold: '❄️'
                                        };
                                        
                                        const trendLabels = {
                                            hot: 'HOT SELLER',
                                            rising: 'RISING',
                                            stable: 'STABLE',
                                            declining: 'DECLINING',
                                            cold: 'COLD'
                                        };
                                        
                                        return (
                                            <tr key={index} className={`hover:bg-gray-50 ${item.is_trending ? 'bg-yellow-50' : ''}`}>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 ${trendColors[item.seasonal_trend]} inline-flex items-center gap-1`}>
                                                        <span className="text-base">{trendIcons[item.seasonal_trend]}</span>
                                                        {trendLabels[item.seasonal_trend]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {item.product_name}
                                                        {item.is_trending && (
                                                            <span className="ml-2 text-red-500 animate-pulse">⚡</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.season}</div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                        {item.category_name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                                    {item.sku}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`text-xs font-medium ${item.batch_number !== 'N/A' ? 'text-blue-600' : 'text-gray-400'}`}>
                                                        {item.batch_number}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.current_stock}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Min: {item.minimum_stock}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {Math.round(item.recent_monthly_demand)} units
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Avg: {Math.round(item.avg_monthly_demand)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className={`text-sm font-bold ${
                                                        item.growth_rate > 20 ? 'text-green-600' :
                                                        item.growth_rate > 0 ? 'text-blue-600' :
                                                        item.growth_rate > -20 ? 'text-orange-600' :
                                                        'text-red-600'
                                                    }`}>
                                                        {item.growth_rate > 0 ? '+' : ''}{item.growth_rate.toFixed(1)}%
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        vs prev period
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${
                                                                    item.performance_score > 80 ? 'bg-green-500' :
                                                                    item.performance_score > 50 ? 'bg-blue-500' :
                                                                    item.performance_score > 30 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(item.performance_score, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-700">
                                                            {item.performance_score.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.seasonal_trend === 'hot' || item.seasonal_trend === 'rising' ? (
                                                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300">
                                                            ✅ INCREASE STOCK +{Math.round((item.predicted_demand / item.current_stock - 1) * 100)}%
                                                        </span>
                                                    ) : item.seasonal_trend === 'declining' || item.seasonal_trend === 'cold' ? (
                                                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                                                            ⚠️ REDUCE ORDERS
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                            ➡️ MAINTAIN LEVELS
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-blue-50 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">{inventoryForecast.length}</span> products analyzed • 
                                <span className="font-semibold text-red-600 ml-2">
                                    {inventoryForecast.filter(i => i.is_trending).length}
                                </span> trending hot products this season
                            </div>
                            <button 
                                onClick={() => fetchInventoryForecast()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                🔄 Refresh Analysis
                            </button>
                        </div>
                    </div>
                )}

                {/* Product Seasonal Trends Analysis Table */}
                {forecastType === 'Seasonal' && productSeasonalTrends.length > 0 && (
                    <div className="relative rounded-xl border bg-white shadow mt-6">
                        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                                📊 Product Seasonal Performance - Quarterly Analysis
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Complete view of all products showing which are <span className="font-semibold text-green-600">"KUSOG"</span> (strong) in each quarter/season
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                    <span className="text-gray-600">⚡ Very Strong (Peak Season)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span className="text-gray-600">💪 Strong (Above Average)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    <span className="text-gray-600">✓ Average</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                    <span className="text-gray-600">⚠ Weak (Below Average)</span>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">SKU</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Batch</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Q1<br/><span className="text-[10px] font-normal">Jan-Mar</span></th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Q2<br/><span className="text-[10px] font-normal">Apr-Jun</span></th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Q3<br/><span className="text-[10px] font-normal">Jul-Sep</span></th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Q4<br/><span className="text-[10px] font-normal">Oct-Dec</span></th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Peak<br/>Season</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Current<br/>Quarter</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-yellow-50">Next Q<br/>Prediction</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Seasonal<br/>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {productSeasonalTrends.map((product, index) => {
                                        const strengthColors = {
                                            very_strong: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                            strong: 'bg-green-100 text-green-800 border-green-300',
                                            average: 'bg-blue-100 text-blue-800 border-blue-300',
                                            weak: 'bg-gray-100 text-gray-600 border-gray-300'
                                        };
                                        
                                        const strengthLabels = {
                                            very_strong: '⚡ PEAK',
                                            strong: '💪 STRONG',
                                            average: '✓ AVERAGE',
                                            weak: '⚠ WEAK'
                                        };
                                        
                                        return (
                                            <tr key={index} className={`hover:bg-gray-50 ${product.is_peak_season ? 'bg-yellow-50' : ''}`}>
                                                <td className="px-4 py-3 sticky left-0 bg-white">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {product.product_name}
                                                        {product.is_peak_season && (
                                                            <span className="ml-2 text-yellow-500">🌟</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Total Annual: {product.total_annual} units
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                        {product.category_name}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className="text-xs text-gray-600 font-mono">{product.sku}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={`text-xs ${product.batch_number !== 'N/A' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                                        {product.batch_number}
                                                    </span>
                                                </td>
                                                
                                                {/* Q1 */}
                                                <td className="px-4 py-3 text-center bg-blue-50">
                                                    <div className="text-sm font-semibold text-gray-900">{product.q1}</div>
                                                    <div className={`text-xs font-medium ${product.q1_change > 0 ? 'text-green-600' : product.q1_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {product.q1_change > 0 ? '+' : ''}{product.q1_change}%
                                                    </div>
                                                </td>
                                                
                                                {/* Q2 */}
                                                <td className="px-4 py-3 text-center bg-blue-50">
                                                    <div className="text-sm font-semibold text-gray-900">{product.q2}</div>
                                                    <div className={`text-xs font-medium ${product.q2_change > 0 ? 'text-green-600' : product.q2_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {product.q2_change > 0 ? '+' : ''}{product.q2_change}%
                                                    </div>
                                                </td>
                                                
                                                {/* Q3 */}
                                                <td className="px-4 py-3 text-center bg-blue-50">
                                                    <div className="text-sm font-semibold text-gray-900">{product.q3}</div>
                                                    <div className={`text-xs font-medium ${product.q3_change > 0 ? 'text-green-600' : product.q3_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {product.q3_change > 0 ? '+' : ''}{product.q3_change}%
                                                    </div>
                                                </td>
                                                
                                                {/* Q4 */}
                                                <td className="px-4 py-3 text-center bg-blue-50">
                                                    <div className="text-sm font-semibold text-gray-900">{product.q4}</div>
                                                    <div className={`text-xs font-medium ${product.q4_change > 0 ? 'text-green-600' : product.q4_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {product.q4_change > 0 ? '+' : ''}{product.q4_change}%
                                                    </div>
                                                </td>
                                                
                                                {/* Peak Season */}
                                                <td className="px-4 py-3 text-center bg-purple-50">
                                                    <div className="text-sm font-bold text-purple-700">{product.peak_quarter}</div>
                                                    <div className="text-xs text-gray-600">{product.peak_value} units</div>
                                                </td>
                                                
                                                {/* Current Quarter */}
                                                <td className="px-4 py-3 text-center bg-green-50">
                                                    <div className="text-sm font-bold text-green-700">{product.current_quarter}</div>
                                                    <div className="text-xs text-gray-600">{product.current_quarter_value} units</div>
                                                </td>
                                                
                                                {/* Next Quarter Prediction */}
                                                <td className="px-4 py-3 text-center bg-yellow-50">
                                                    <div className="text-sm font-bold text-orange-700">{product.next_quarter_prediction}</div>
                                                    <div className="text-xs text-gray-600">predicted</div>
                                                </td>
                                                
                                                {/* Seasonal Status */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${strengthColors[product.seasonal_strength]}`}>
                                                        {strengthLabels[product.seasonal_strength]}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">{productSeasonalTrends.length}</span> products with seasonal data • 
                                <span className="font-semibold text-green-600 ml-2">
                                    {productSeasonalTrends.filter(p => p.is_peak_season).length}
                                </span> products in peak season now 🌟
                            </div>
                            <button 
                                onClick={() => fetchSeasonalTrends()}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                🔄 Refresh Seasonal Analysis
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <Notification />
        </AppLayout>
    );
}