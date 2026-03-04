import AppLayout from '@/layouts/app-layout';
import { Activity, Search, RefreshCw, Download, Filter, X, TrendingUp, TrendingDown, Minus, Package, User, Calendar, FileText } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { stockMovementService, StockMovement, StockMovementStats, PaginationData } from '../../../services/stockMovementServices';

const getMovementTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
        'in': { bg: "bg-green-100", text: "text-green-800", icon: TrendingUp },
        'out': { bg: "bg-red-100", text: "text-red-800", icon: TrendingDown },
        'adjustment': { bg: "bg-blue-100", text: "text-blue-800", icon: Minus }
    };
    
    const style = styles[type] || styles['adjustment'];
    const Icon = style.icon;
    
    return (
        <span className={`${style.bg} ${style.text} text-xs font-semibold px-3 py-1 rounded-full capitalize inline-flex items-center`}>
            <Icon className="h-3 w-3 mr-1" />
            {type === 'in' ? 'Stock In' : type === 'out' ? 'Stock Out' : 'Adjustment'}
        </span>
    );
};

const MovementDetailsModal = ({ 
    isOpen, 
    onClose, 
    movement 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    movement?: StockMovement | null; 
}) => {
    if (!isOpen || !movement) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                    <div className="bg-[#00c951] px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Movement Details</h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Movement Type</label>
                                    <div>{getMovementTypeBadge(movement.type)}</div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                                    <p className="text-lg font-bold text-gray-900">{movement.quantity}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Changes</label>
                                    <div className="bg-gray-50 p-3 rounded-xl">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Previous:</span>
                                            <span className="font-medium">{movement.previous_stock}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">New:</span>
                                            <span className="font-medium">{movement.new_stock}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                            <span className="text-sm text-gray-600">Change:</span>
                                            <span className={`font-bold ${movement.new_stock - movement.previous_stock >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {movement.new_stock - movement.previous_stock >= 0 ? '+' : ''}
                                                {movement.new_stock - movement.previous_stock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
                                    <div className="bg-gray-50 p-3 rounded-xl">
                                        <p className="font-medium text-gray-900">
                                            {movement.inventory_item?.name || 'Unknown Item'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            SKU: {movement.inventory_item?.sku || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
                                    <p className="text-gray-900">{movement.user?.name || 'Unknown User'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date & Time</label>
                                    <p className="text-gray-900">{new Date(movement.created_at).toLocaleString()}</p>
                                </div>

                                {movement.reference_number && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Number</label>
                                        <p className="text-gray-900">{movement.reference_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded-xl">{movement.reason}</p>
                        </div>

                        {movement.notes && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                <p className="text-gray-900 bg-gray-50 p-3 rounded-xl">{movement.notes}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-[#00c951] text-white rounded-xl hover:bg-[#00b048] transition-all font-medium shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Notification = ({ 
    type, 
    message, 
    onClose 
}: { 
    type: 'success' | 'error'; 
    message: string; 
    onClose: () => void; 
}) => {
    const bgColor = type === 'success' 
        ? 'bg-[#00c951]' 
        : 'bg-gradient-to-r from-red-500 to-red-600';
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
            <div className={`${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                    <div className="font-medium">{message}</div>
                    <button 
                        onClick={onClose}
                        className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function StockMovementPage() {
    const { auth } = usePage().props as any;
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [stats, setStats] = useState<StockMovementStats>({
        total_movements: 0,
        stock_in_today: 0,
        stock_out_today: 0,
        adjustments_today: 0,
        movements_this_week: 0,
        movements_this_month: 0
    });
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState('All');
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchMovements = async (page = 1) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                per_page: pagination.per_page,
                ...(typeFilter !== 'All' && { type: typeFilter.toLowerCase() }),
                ...(dateFromFilter && { date_from: dateFromFilter }),
                ...(dateToFilter && { date_to: dateToFilter })
            };

            const response = await stockMovementService.getMovements(params);
            setMovements(response.data);
            setPagination(response.pagination);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to fetch movements');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await stockMovementService.getMovementStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchMovements();
        fetchStats();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMovements(1);
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    }, [typeFilter, dateFromFilter, dateToFilter]);

    const handlePageChange = (page: number) => {
        fetchMovements(page);
    };

    const handleExport = () => {
        try {
            generatePDF();
            showNotification('success', 'Stock movements PDF exported successfully');
        } catch (error) {
            showNotification('error', 'Failed to export stock movements data');
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

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Movement Report</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 20mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 9pt;
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
                        border-bottom: 3px solid #00c951;
                        margin-bottom: 20px;
                    }
                    
                    .company-name { color: #00c951; font-size: 28pt; font-weight: bold; margin-bottom: 5px; }
                    
                    .company-name {
                        color: #00c951;
                        font-size: 28pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }

                    .header h1 {
                        color: #333;
                        
                        font-size: 22pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-bottom: 10px;
                    }
                    
                    .header .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 8pt;
                        color: #666;
                    }
                    
                    .summary {
                        background: #dcfce7;
                        border: 2px solid #00c951;
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
                        font-size: 8pt;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    
                    .summary-item .value {
                        font-size: 16pt;
                        font-weight: bold;
                        color: #00c951;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 8pt;
                    }
                    
                    thead {
                        background: #00c951;
                        color: white;
                    }
                    
                    th {
                        padding: 8px 6px;
                        text-align: left;
                        font-size: 8pt;
                        font-weight: bold;
                        border: 1px solid #00a642;
                    }
                    
                    td {
                        padding: 6px;
                        border: 1px solid #ddd;
                        font-size: 8pt;
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
                        padding: 15px 15mm;
                        border-top: 2px solid #00c951;
                        background: white;
                        font-size: 7pt;
                        color: #666;
                    }
                    
                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .footer strong {
                        color: #00c951;
                    }
                    
                    .badge {
                        display: inline-block;
                        padding: 3px 10px;
                        border-radius: 10px;
                        font-size: 7pt;
                        font-weight: bold;
                    }
                    
                    .badge-in {
                        background: #dcfce7;
                        color: #166534;
                    }
                    
                    .badge-out {
                        background: #fee2e2;
                        color: #991b1b;
                    }
                    
                    .badge-adjustment {
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
                        <h1>STOCK MOVEMENT REPORT</h1>
                        <div class="subtitle">Complete history of stock movements</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> All Time</div>
                            <div><strong>Generated by:</strong> ${auth.user?.name || 'User'}</div>
                            <div><strong>Type:</strong> ${typeFilter === 'all' ? 'All Types' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}</div>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Movements</div>
                            <div class="value">${movements.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Stock In</div>
                            <div class="value">${movements.filter(m => m.type === 'in').length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Stock Out</div>
                            <div class="value">${movements.filter(m => m.type === 'out').length}</div>
                        </div>
                    </div>
                    
                    ${movements.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 12%;">Date & Time</th>
                                    <th style="width: 22%;">Product</th>
                                    <th style="width: 10%;">Type</th>
                                    <th style="width: 8%;">Stock Change</th>
                                    <th style="width: 12%;">Available</th>
                                    <th style="width: 20%;">Reason</th>
                                    <th style="width: 12%;">User</th>
                                    <th style="width: 4%;">Ref</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movements.map((movement) => `
                                    <tr>
                                        <td>
                                            <div>${new Date(movement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                                            <div style="color: #666; font-size: 7pt;">${new Date(movement.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td>
                                            <strong>${movement.inventory_item?.name || 'Unknown'}</strong><br/>
                                            <span style="color: #666; font-size: 7pt;">SKU: ${movement.inventory_item?.sku || 'N/A'}</span>
                                        </td>
                                        <td>
                                            <span class="badge badge-${movement.type}">
                                                ${movement.type === 'in' ? 'Stock In' : movement.type === 'out' ? 'Stock Out' : 'Adjustment'}
                                            </span>
                                        </td>
                                        <td style="text-align: right; font-weight: bold;">
                                            ${movement.type === 'out' ? '-' : '+'}${movement.quantity}
                                        </td>
                                        <td>
                                            <span style="color: #666;">${movement.previous_stock}</span>
                                            <span style="margin: 0 5px;">→</span>
                                            <strong>${movement.new_stock}</strong>
                                        </td>
                                        <td style="font-size: 7pt;">${movement.reason}</td>
                                        <td>${movement.user?.name || 'Unknown'}</td>
                                        <td style="font-size: 7pt;">${movement.reference_number || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No stock movements found</p>
                        </div>
                    `}
                    
                    <div class="footer">
                        <div class="footer-content">
                            <div class="footer-left">
                                <strong>H2-MED Enterprises</strong> | Pharmacy Inventory System<br>
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

    const handleViewDetails = (movement: StockMovement) => {
        setSelectedMovement(movement);
        setShowDetailsModal(true);
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;
        
        const pages = [];
        const maxPages = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxPages / 2));
        let endPage = Math.min(pagination.last_page, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button 
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-4 py-2 mx-1 rounded-lg font-medium transition-all ${
                        i === pagination.current_page ? 
                        'bg-[#00c951] text-white shadow-lg' : 
                        'bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return (
            <div className="flex justify-center items-center mt-6 space-x-2">
                <button 
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                    Previous
                </button>
                
                {pages}
                
                <button 
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-[#f3f4f6]">
                <div className="container mx-auto px-6 py-8">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center mb-6 md:mb-0">
                            <div className="bg-[#ff1a1a] p-3 rounded-xl mr-4">
                                <Activity className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Stock Movements</h1>
                                <p className="text-gray-600 mt-1">Track all inventory movements and changes</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button 
                                onClick={handleExport}
                                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-medium"
                            >
                                <Download className="h-5 w-5 mr-2" />
                                Export
                            </button>
                            <button 
                                onClick={() => {
                                    fetchMovements(pagination.current_page);
                                    fetchStats();
                                }}
                                className="inline-flex items-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Total Movements</div>
                            <div className="text-3xl font-bold text-gray-900">{stats.total_movements}</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Stock In Today</div>
                            <div className="text-3xl font-bold text-green-600">{stats.stock_in_today}</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Stock Out Today</div>
                            <div className="text-3xl font-bold text-red-600">{stats.stock_out_today}</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Adjustments Today</div>
                            <div className="text-3xl font-bold text-blue-600">{stats.adjustments_today}</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">This Week</div>
                            <div className="text-3xl font-bold text-[#00c951]">{stats.movements_this_week}</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">This Month</div>
                            <div className="text-3xl font-bold text-[#00c951]">{stats.movements_this_month}</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center">
                                <Filter className="h-5 w-5 text-gray-400 mr-3" />
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                >
                                    <option value="All">All Types</option>
                                    <option value="in">Stock In</option>
                                    <option value="out">Stock Out</option>
                                    <option value="adjustment">Adjustment</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                                <input
                                    type="date"
                                    value={dateFromFilter}
                                    onChange={(e) => setDateFromFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    placeholder="From Date"
                                />
                            </div>
                            <div className="flex items-center">
                                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                                <input
                                    type="date"
                                    value={dateToFilter}
                                    onChange={(e) => setDateToFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    placeholder="To Date"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Movements Table */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock Change</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Available</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="h-8 w-8 text-[#00c951] animate-spin" />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : movements.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <Activity className="h-12 w-12 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">No movements found</p>
                                                    <p className="text-sm">Try adjusting your filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        movements.map((movement) => (
                                            <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {new Date(movement.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(movement.created_at).toLocaleTimeString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#00c951] flex items-center justify-center shadow-sm">
                                                            <Package className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {movement.inventory_item?.name || 'Unknown Item'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                SKU: {movement.inventory_item?.sku || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getMovementTypeBadge(movement.type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        <span className="text-gray-500">{movement.previous_stock}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="font-medium">{movement.new_stock}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {movement.reason}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-gray-600" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {movement.user?.name || 'Unknown User'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handleViewDetails(movement)}
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-[#00c951] hover:bg-[#dcfce7] rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <FileText className="h-4 w-4 mr-1" />
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {renderPagination()}
                    </div>

                    <MovementDetailsModal
                        isOpen={showDetailsModal}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setSelectedMovement(null);
                        }}
                        movement={selectedMovement}
                    />

                    {notification && (
                        <Notification
                            type={notification.type}
                            message={notification.message}
                            onClose={() => setNotification(null)}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}