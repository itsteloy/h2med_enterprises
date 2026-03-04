import AppLayout from '@/layouts/app-layout';
import { 
    BarChart2,
    PieChart, 
    LineChart,
    FileText, 
    Calendar,
    ArrowDown,
    Download,
    Filter,
    RefreshCw,
    Package,
    TrendingUp,
    AlertCircle,
    DollarSign,
    ChevronDown
} from 'lucide-react';
import { useState } from 'react';

// Sample report data
const reportCards = [
    { 
        title: 'Inventory Valuation', 
        description: 'Current value of all inventory items', 
        value: '₱2,456,780', 
        change: '+5.2%',
        trend: 'up',
        icon: Package,
        color: 'bg-blue-100 text-blue-500'
    },
    { 
        title: 'Out of Stock Items', 
        description: 'Products currently at zero inventory', 
        value: '8', 
        change: '-2',
        trend: 'down',
        icon: AlertCircle,
        color: 'bg-red-100 text-red-500'
    },
    { 
        title: 'Inventory Turnover', 
        description: 'Rate at which inventory is sold (last 30 days)', 
        value: '2.4x', 
        change: '+0.3',
        trend: 'up',
        icon: TrendingUp,
        color: 'bg-green-100 text-green-500'
    },
    { 
        title: 'Average Item Value', 
        description: 'Average cost per inventory item', 
        value: '₱1,245', 
        change: '+₱125',
        trend: 'up',
        icon: DollarSign,
        color: 'bg-purple-100 text-purple-500'
    }
];

// Sample inventory movement data
const inventoryMovementData = [
    { 
        id: 1, 
        sku: 'P-0121', 
        name: 'Jasmine Rice 5kg', 
        category: 'Rice & Grains', 
        startingStock: 35, 
        purchases: 20, 
        sales: 13, 
        adjustments: 0, 
        endingStock: 42,
        turnover: 0.37
    },
    { 
        id: 2, 
        sku: 'P-0134', 
        name: 'Canned Tuna in Oil 180g', 
        category: 'Canned Goods', 
        startingStock: 90, 
        purchases: 40, 
        sales: 52, 
        adjustments: 0, 
        endingStock: 78,
        turnover: 0.58
    },
    { 
        id: 3, 
        sku: 'P-0156', 
        name: 'Cooking Oil 1L', 
        category: 'Oils & Condiments', 
        startingStock: 25, 
        purchases: 15, 
        sales: 25, 
        adjustments: 0, 
        endingStock: 15,
        turnover: 1.00
    },
    { 
        id: 4, 
        sku: 'P-0189', 
        name: 'Instant Coffee 200g', 
        category: 'Beverages', 
        startingStock: 44, 
        purchases: 20, 
        sales: 30, 
        adjustments: 0, 
        endingStock: 34,
        turnover: 0.68
    },
    { 
        id: 5, 
        sku: 'P-0212', 
        name: 'Fresh Milk 1L', 
        category: 'Dairy', 
        startingStock: 20, 
        purchases: 30, 
        sales: 42, 
        adjustments: 0, 
        endingStock: 8,
        turnover: 2.10
    },
    { 
        id: 6, 
        sku: 'P-0245', 
        name: 'Laundry Detergent 1kg', 
        category: 'Household', 
        startingStock: 18, 
        purchases: 24, 
        sales: 14, 
        adjustments: 0, 
        endingStock: 28,
        turnover: 0.78
    },
    { 
        id: 7, 
        sku: 'P-0267', 
        name: 'Toothpaste 150g', 
        category: 'Personal Care', 
        startingStock: 5, 
        purchases: 10, 
        sales: 15, 
        adjustments: 0, 
        endingStock: 0,
        turnover: 3.00
    },
    { 
        id: 8, 
        sku: 'P-0289', 
        name: 'Paper Towels 2-Ply 100ct', 
        category: 'Paper Goods', 
        startingStock: 32, 
        purchases: 48, 
        sales: 26, 
        adjustments: 0, 
        endingStock: 54,
        turnover: 0.81
    }
];

// Sample top selling products
const topSellingProducts = [
    { name: 'Fresh Milk 1L', category: 'Dairy', sales: 42, revenue: '₱3,580.50' },
    { name: 'Canned Tuna in Oil 180g', category: 'Canned Goods', sales: 52, revenue: '₱2,379.00' },
    { name: 'Cooking Oil 1L', category: 'Oils & Condiments', sales: 25, revenue: '₱3,012.50' },
    { name: 'Instant Coffee 200g', category: 'Beverages', sales: 30, revenue: '₱5,250.00' },
    { name: 'Toothpaste 150g', category: 'Personal Care', sales: 15, revenue: '₱982.50' }
];

// Sample report options
const reportTimeframes = [
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
];

export default function ReportsPage() {
    const [timeframe, setTimeframe] = useState('last30days');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState('2025-04-09');
    const [endDate, setEndDate] = useState('2025-05-09');
    
    const handleTimeframeChange = (value) => {
        setTimeframe(value);
        if (value === 'custom') {
            setShowDatePicker(true);
        } else {
            setShowDatePicker(false);
        }
    };
    
    return (
        <AppLayout>
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
                        <p className="text-gray-500">Comprehensive reporting and analytics for your inventory</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <select 
                                className="appearance-none rounded-lg border bg-white pl-4 pr-10 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={timeframe}
                                onChange={(e) => handleTimeframeChange(e.target.value)}
                            >
                                {reportTimeframes.map((option, index) => (
                                    <option key={index} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                        <button className="flex items-center gap-1 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50">
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        <button className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                    </div>
                </div>
                
                {/* Date Range Picker (only shown when Custom is selected) */}
                {showDatePicker && (
                    <div className="flex flex-wrap gap-4 bg-white rounded-xl border shadow p-4">
                        <div className="flex items-center">
                            <div className="flex items-center mr-4">
                                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                                <span className="text-sm text-gray-700">Date Range:</span>
                            </div>
                            <input 
                                type="date" 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 mr-2"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-gray-500 mx-2">to</span>
                            <input 
                                type="date" 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <button className="ml-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">
                                Apply
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reportCards.map((card, index) => (
                        <div key={index} className="bg-white rounded-xl border shadow p-4">
                            <div className="flex items-center">
                                <div className={`p-3 rounded-full ${card.color}`}>
                                    <card.icon className="h-6 w-6" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                    <p className="text-2xl font-semibold text-gray-800">{card.value}</p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs text-gray-500">{card.description}</p>
                                <p className={`text-xs font-medium mt-1 ${
                                    card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {card.change} from previous period
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative aspect-video rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">Inventory Movement</h3>
                        </div>
                        <div className="flex items-center justify-center h-48 p-4">
                            <div className="flex flex-col items-center">
                                <BarChart2 className="h-16 w-16 text-green-500 mb-2" />
                                <p className="text-sm text-gray-500">Inventory inflow and outflow by category</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative aspect-video rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">Category Distribution</h3>
                        </div>
                        <div className="flex items-center justify-center h-48 p-4">
                            <div className="flex flex-col items-center">
                                <PieChart className="h-16 w-16 text-blue-500 mb-2" />
                                <p className="text-sm text-gray-500">Distribution of products by category</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Inventory Movement Table */}
                    <div className="lg:col-span-3 relative rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">Inventory Movement Report</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Starting</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            <span className="text-green-600">+ Purchases</span>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            <span className="text-red-600">- Sales</span>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            <span className="text-blue-600">± Adjustments</span>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ending</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {inventoryMovementData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.sku}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.startingStock}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+{item.purchases}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">-{item.sales}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{item.adjustments}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.endingStock}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.turnover.toFixed(2)}x</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium">{inventoryMovementData.length}</span> of <span className="font-medium">{inventoryMovementData.length}</span> items
                            </div>
                            <div className="flex gap-2">
                                <button className="text-sm font-medium text-green-600 hover:text-green-500">
                                    Export to Excel
                                </button>
                                <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                    Export to PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Top Selling Products */}
                    <div className="relative rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">Top Selling Products</h3>
                        </div>
                        <div className="p-4">
                            <ul className="divide-y divide-gray-200">
                                {topSellingProducts.map((product, index) => (
                                    <li key={index} className="py-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-500">{product.category}</p>
                                                <p className="text-xs font-medium text-green-600">{product.sales} sold</p>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between">
                                                <p className="text-xs text-gray-500">Revenue</p>
                                                <p className="text-xs font-medium text-gray-900">{product.revenue}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-3 border-t bg-gray-50 text-right">
                            <button className="text-sm font-medium text-green-600 hover:text-green-500">View Sales Report</button>
                        </div>
                    </div>
                </div>

                {/* Additional Charts Row */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="relative rounded-xl border bg-white shadow">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium text-gray-800">Inventory Value Trend</h3>
                        </div>
                        <div className="flex items-center justify-center h-64 p-4">
                            <div className="flex flex-col items-center">
                                <LineChart className="h-16 w-16 text-purple-500 mb-2" />
                                <p className="text-sm text-gray-500">Inventory value trend over time</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}