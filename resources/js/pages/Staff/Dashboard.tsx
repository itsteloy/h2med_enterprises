import AppLayout from '@/layouts/app-layout';
import { 
    BarChart3, Package, TrendingUp, TrendingDown, AlertTriangle, Users, Tag, 
    RefreshCw, ShoppingCart, Truck, Clock, PieChart, 
    Activity, CheckCircle, XCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { dashboardService, DashboardOverview, DashboardCharts } from '../../../services/dashboardServices';
import { LucideIcon } from 'lucide-react';

// Interfaces for component props
interface ActivityItem {
    id?: number;
    inventory_item?: {
        name?: string;
        sku?: string;
    };
    sku?: string;
    name?: string;
    quantity?: number;
    receipt_number?: string;
    payment_method?: string;
    total?: number;
    stock_quantity?: number;
    expiry_date?: string;
    created_at?: string;
}

interface AlertItem {
    id?: number;
    name?: string;
    sku?: string;
    stock_quantity?: number;
    minimum_stock?: number;
    expiry_date?: string;
    batch_number?: string;
    batch?: string;
    lot_number?: string;
    batch_no?: string;
    category?: {
        name?: string;
    };
}

interface ChartDataItem {
    name?: string;
    value?: number;
    count?: number;
    total_sales?: number;
    total_stock?: number;
    total_value?: number;
    date?: string;
    category?: string;
    supplier?: string;
    stock_in?: number;
    stock_out?: number;
    net_change?: number;
}

const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    trend,
    trendValue,
    subtitle,
    loading = false
}: {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    subtitle?: string;
    loading?: boolean;
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
        return null;
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
                    {loading ? (
                        <div className="animate-pulse">
                            <div className="h-7 bg-gray-200 rounded w-20 mb-1"></div>
                            {subtitle && <div className="h-3 bg-gray-200 rounded w-16"></div>}
                        </div>
                    ) : (
                        <>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
                        </>
                    )}
                    {trendValue && !loading && (
                        <div className="flex items-center mt-1">
                            {getTrendIcon()}
                            <span className={`text-xs ml-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                                {trendValue}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`${color} p-2.5 rounded-xl shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>
    );
};

const TransactionStatsCard = ({ 
    todaysSales, 
    transactionsToday, 
    loading = false 
}: { 
    todaysSales: number;
    transactionsToday: number;
    loading?: boolean;
}) => {
    return (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-5 text-white">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Today's Sales</h3>
                <ShoppingCart className="h-5 w-5" />
            </div>
            {loading ? (
                <div className="animate-pulse">
                    <div className="h-7 bg-white/20 rounded w-28 mb-1"></div>
                    <div className="h-3 bg-white/20 rounded w-20"></div>
                </div>
            ) : (
                <>
                    <p className="text-2xl font-bold mb-1">₱{todaysSales.toLocaleString()}</p>
                    <p className="text-blue-100 text-xs">{transactionsToday} transactions</p>
                </>
            )}
        </div>
    );
};

const RecentActivityCard = ({ 
    title, 
    items,
    type = 'movements',
    loading = false
}: {
    title: string;
    items: ActivityItem[];
    type?: 'movements' | 'items' | 'transactions';
    loading?: boolean;
}) => {
    const getActivityDisplay = (item: ActivityItem) => {
        if (type === 'movements') {
            return {
                name: item.inventory_item?.name || 'Unknown Item',
                detail: item.sku || item.inventory_item?.sku || 'No SKU',
                value: item.quantity !== undefined ? `${item.quantity} units` : 'N/A'
            };
        } else if (type === 'transactions') {
            return {
                name: item.receipt_number || 'No receipt',
                detail: item.payment_method || 'Unknown method',
                value: `₱${item.total?.toLocaleString() || 0}`
            };
        } else {
            return {
                name: item.name || 'Unknown Item',
                detail: item.sku || 'No SKU',
                value: item.stock_quantity !== undefined ? `${item.stock_quantity} units` : 'N/A'
            };
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {loading ? (
                    Array(3).fill(0).map((_, index) => (
                        <div key={index} className="animate-pulse flex items-center p-3 bg-gray-50 rounded-xl">
                            <div className="w-2 h-2 bg-gray-200 rounded-full mr-3"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    items.slice(0, 5).map((item, index) => {
                        const display = getActivityDisplay(item);
                        return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-[#00c951] rounded-full mr-3"></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{display.name}</p>
                                        <p className="text-xs text-gray-500">{display.detail}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">{display.value}</p>
                                    <p className="text-xs text-gray-400">
                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'No date'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const AlertsCard = ({ 
    title, 
    items, 
    alertType,
    loading = false
}: {
    title: string;
    items: AlertItem[];
    alertType: 'low-stock' | 'expiring' | 'out-of-stock';
    loading?: boolean;
}) => {
    const getAlertConfig = () => {
        switch (alertType) {
            case 'low-stock':
                return {
                    icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
                    bgColor: 'bg-orange-100',
                    textColor: 'text-orange-800'
                };
            case 'expiring':
                return {
                    icon: <Clock className="h-5 w-5 text-red-500" />,
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-800'
                };
            case 'out-of-stock':
                return {
                    icon: <XCircle className="h-5 w-5 text-red-600" />,
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-800'
                };
            default:
                return {
                    icon: <Package className="h-5 w-5 text-gray-500" />,
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-800'
                };
        }
    };

    const alertConfig = getAlertConfig();

    const getAlertValue = (item: AlertItem) => {
        switch (alertType) {
            case 'low-stock':
                return `${item.stock_quantity || 0}/${item.minimum_stock || 0}`;
            case 'expiring': {
                const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'No date';
                // Check multiple possible field names for batch
                const batchInfo = item.batch_number || item.batch || item.lot_number || item.batch_no || 'No batch';
                return `${expiryDate} | Batch: ${batchInfo}`;
            }
            case 'out-of-stock':
                return 'Out of Stock';
            default:
                return 'N/A';
        }
    };

    const getItemSubtitle = (item: AlertItem) => {
        if (alertType === 'expiring') {
            const parts = [`SKU: ${item.sku || 'No SKU'}`];
            // Check multiple possible field names for batch
            const batchNumber = item.batch_number || item.batch || item.lot_number || item.batch_no;
            if (batchNumber) {
                parts.push(`Batch: ${batchNumber}`);
            }
            return parts.join(' • ');
        }
        return `SKU: ${item.sku || 'No SKU'}`;
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center">
                    {alertConfig.icon}
                    <span className="ml-2 text-sm font-medium text-gray-600">{items.length}</span>
                </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {loading ? (
                    Array(3).fill(0).map((_, index) => (
                        <div key={index} className="animate-pulse flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3"></div>
                                <div>
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                        <p>No alerts</p>
                        <p className="text-xs text-gray-400 mt-1">Everything looks good!</p>
                    </div>
                ) : (
                    items.slice(0, 5).map((item, index) => {
                        // Debug logging - remove this after fixing the issue
                       // if (alertType === 'expiring') {
                        //    console.log('Expiring item data:', item);
                        //}
                        
                        return (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                        <Package className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{item.name || 'Unknown Item'}</p>
                                        <p className="text-xs text-gray-500">{getItemSubtitle(item)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alertConfig.bgColor} ${alertConfig.textColor}`}>
                                        {getAlertValue(item)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const ChartCard = ({ 
    title, 
    data, 
    type,
    loading = false
}: {
    title: string;
    data: ChartDataItem[];
    type: 'category' | 'supplier' | 'trend';
    loading?: boolean;
}) => {
    const renderChart = () => {
        if (loading) {
            return (
                <div className="space-y-3">
                    {Array(4).fill(0).map((_, index) => (
                        <div key={index} className="animate-pulse space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2"></div>
                        </div>
                    ))}
                </div>
            );
        }

        if (type === 'category' || type === 'supplier') {
            const maxValue = Math.max(...data.map(d => type === 'category' ? (d.total_stock || 0) : (d.total_value || 0)));
            
            return (
                <div className="space-y-3">
                    {data.slice(0, 5).map((item, index) => {
                        const value = type === 'category' ? (item.total_stock || 0) : (item.total_value || 0);
                        const percentage = maxValue > 0 ? ((value || 0) / maxValue) * 100 : 0;
                        
                        return (
                            <div key={index} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        {type === 'category' ? item.category : item.supplier}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {type === 'category' ? 
                                            `${item.total_stock} units` : 
                                            `₱${item.total_value?.toLocaleString() || 0}`
                                        }
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-[#00c951] h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        
        // Trend chart
        return (
            <div className="space-y-3">
                {data.slice(0, 7).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">
                            {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}
                        </span>
                        <div className="flex space-x-4 text-sm">
                            <span className="text-green-600">In: {item.stock_in || 0}</span>
                            <span className="text-red-600">Out: {item.stock_out || 0}</span>
                            <span className={`font-medium ${(item.net_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(item.net_change || 0) >= 0 ? '+' : ''}{item.net_change || 0}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            {data.length === 0 && !loading ? (
                <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No data available</p>
                </div>
            ) : (
                renderChart()
            )}
        </div>
    );
};

export default function AdminDashboard() {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [posStats, setPosStats] = useState<{
        daily_sales?: number;
        transactions_today?: number;
        popular_items?: Array<{
            id: number;
            name: string;
            sales_count: number;
        }>;
    } | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Keep the same simple approach as your working version
            const [overviewResponse, chartsResponse] = await Promise.all([
                dashboardService.getOverview(),
                dashboardService.getCharts()
            ]);
            
            setOverview(overviewResponse.data);
            setCharts(chartsResponse.data);

            // Try to fetch additional data but don't break if it fails
            try {
                const posResponse = await fetch('/api/pos/stats');
                if (posResponse.ok) {
                    const posData = await posResponse.json();
                    setPosStats(posData.data);
                }
            } catch {
                console.log('POS stats not available');
            }

            try {
                const transactionsResponse = await fetch('/api/transactions?per_page=5');
                if (transactionsResponse.ok) {
                    const transactionsData = await transactionsResponse.json();
                    setRecentTransactions(transactionsData.data || []);
                }
            } catch {
                console.log('Recent transactions not available');
            }
            
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchDashboardData();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-[#dcfce7] flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <RefreshCw className="h-12 w-12 text-[#00c951] animate-spin mb-4" />
                        <p className="text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-screen bg-[#f3f4f6]">
                <div className="container mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center mb-6 md:mb-0">
                            <div className="bg-[#ff1a1a] p-3 rounded-xl mr-4">
                                <BarChart3 className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                                <p className="text-gray-600 mt-1">Welcome back! Here's your inventory overview</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Last updated: {lastRefresh.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {/* Main Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Items"
                            value={overview?.inventory_summary.total_items || 0}
                            icon={Package}
                            color="bg-[#00c951]"
                            subtitle="Active inventory items"
                            loading={loading}
                        />
                        <StatCard
                            title="Low Stock Items"
                            value={overview?.inventory_summary.low_stock_items || 0}
                            icon={AlertTriangle}
                            color="bg-yellow-500"
                            subtitle="Items below minimum"
                            loading={loading}
                        />
                        <StatCard
                            title="Out of Stock"
                            value={overview?.inventory_summary.out_of_stock_items || 0}
                            icon={TrendingDown}
                            color="bg-red-500"
                            subtitle="Items to reorder"
                            loading={loading}
                        />
                        <StatCard
                            title="Total Value"
                            value={`₱${overview?.inventory_summary.total_value?.toLocaleString() || 0}`}
                            icon={Package}
                            color="bg-blue-500"
                            subtitle="Total stock value"
                            loading={loading}
                        />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <TransactionStatsCard
                            todaysSales={posStats?.daily_sales || 0}
                            transactionsToday={posStats?.transactions_today || 0}
                            loading={loading}
                        />
                        <StatCard
                            title="Categories"
                            value={overview?.quick_stats.categories_count || 0}
                            icon={Tag}
                            color="bg-purple-500"
                            subtitle="Product categories"
                            loading={loading}
                        />
                        <StatCard
                            title="Suppliers"
                            value={overview?.quick_stats.suppliers_count || 0}
                            icon={Truck}
                            color="bg-indigo-500"
                            subtitle="Active suppliers"
                            loading={loading}
                        />
                        <StatCard
                            title="Users"
                            value={overview?.quick_stats.users_count || 0}
                            icon={Users}
                            color="bg-pink-500"
                            subtitle="Active users"
                            loading={loading}
                        />
                    </div>

                    {/* Charts and Activities */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <ChartCard
                            title="Stock by Category"
                            data={charts?.stock_levels_by_category || []}
                            type="category"
                            loading={loading}
                        />
                        <ChartCard
                            title="Value by Supplier"
                            data={charts?.inventory_value_by_supplier || []}
                            type="supplier"
                            loading={loading}
                        />
                        <ChartCard
                            title="Stock Movement Trend"
                            data={charts?.stock_movements_trend || []}
                            type="trend"
                            loading={loading}
                        />
                    </div>

                    {/* Recent Activities and Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <RecentActivityCard
                            title="Recent Stock Movements"
                            items={overview?.recent_activities.recent_stock_movements || []}
                            type="movements"
                            loading={loading}
                        />
                        <RecentActivityCard
                            title="Recently Added Items"
                            items={overview?.recent_activities.recently_added_items || []}
                            type="items"
                            loading={loading}
                        />
                        <RecentActivityCard
                            title="Recent Transactions"
                            items={recentTransactions}
                            type="transactions"
                            loading={loading}
                        />
                    </div>

                    {/* Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <AlertsCard
                            title="Low Stock Alerts"
                            items={(overview?.alerts.low_stock_items || []).filter(item => item.stock_quantity > 0 && item.stock_quantity <= item.minimum_stock)}
                            alertType="low-stock"
                            loading={loading}
                        />
                        <AlertsCard
                            title="Expiring Soon"
                            items={overview?.alerts.expiring_soon || []}
                            alertType="expiring"
                            loading={loading}
                        />
                        <AlertsCard
                            title="Out of Stock Items"
                            items={overview?.alerts.out_of_stock_items || []}
                            alertType="out-of-stock"
                            loading={loading}
                        />
                    </div>

                    {/* Footer Info */}
                    <div className="mt-12 text-center text-gray-500 text-sm">
                        <p>Dashboard automatically refreshes every 5 minutes</p>
                        <p className="mt-1">Last refresh: {lastRefresh.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}