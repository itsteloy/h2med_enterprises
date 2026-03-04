import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { 
    Calendar, AlertTriangle, Download, RefreshCw, Search, Filter, Package, 
    Clock, TrendingDown, FileText, X, ChevronLeft, ChevronRight, Loader2,
    AlertCircle, CheckCircle, Eye, QrCode, Tag, Truck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { inventoryService, ExpiringItem, ExpirationSummary } from '../../../services/inventoryServices';
import PesoIcon from '../../components/icons/PesoIcon';

const StatsCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color
}: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    color: string;
}) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            </div>
            <div className={`${color} p-3 rounded-lg shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
    </div>
);

const Notification = ({ 
    type, 
    message, 
    onClose 
}: { 
    type: 'success' | 'error' | 'warning'; 
    message: string; 
    onClose: () => void; 
}) => {
    const bgColor = type === 'success' 
        ? 'bg-gradient-to-r from-[#00c951] to-[#00a642]' 
        : type === 'error'
        ? 'bg-gradient-to-r from-red-500 to-red-600'
        : 'bg-gradient-to-r from-amber-500 to-orange-500';
    
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [onClose]);
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
            <div className={`${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm max-w-md`}>
                <div className="flex items-center justify-between">
                    <div className="font-medium pr-4">{message}</div>
                    <button 
                        onClick={onClose}
                        className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const PullOutModal = ({ 
    isOpen, 
    onClose, 
    item, 
    onConfirm 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    item: ExpiringItem | null;
    onConfirm: (quantity: number, reason: string) => void;
}) => {
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('expired');
    const [customReason, setCustomReason] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (item) {
            setQuantity(item.stock_quantity);
            setReason('expired');
            setCustomReason('');
        }
    }, [item]);
    
    if (!isOpen || !item) return null;
    
    const handleSubmit = async () => {
        const finalReason = reason === 'custom' ? customReason : reason;
        if (quantity > 0 && quantity <= item.stock_quantity && finalReason.trim()) {
            setLoading(true);
            await onConfirm(quantity, finalReason);
            setLoading(false);
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl mr-3">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Force Pull Out</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-1">{item.name}</p>
                        <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                        {item.batch_number && (
                            <p className="text-xs text-gray-600">Batch: {item.batch_number}</p>
                        )}
                        <p className="text-xs text-red-600 font-medium mt-2">
                            Expired: {formatDate(item.expiry_date)}
                        </p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity to Pull Out <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={item.stock_quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Available: {item.stock_quantity} units
                        </p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-2"
                            disabled={loading}
                        >
                            <option value="expired">Expired Product</option>
                            <option value="damaged">Damaged</option>
                            <option value="quality_issue">Quality Issue</option>
                            <option value="recall">Product Recall</option>
                            <option value="custom">Custom Reason</option>
                        </select>
                        
                        {reason === 'custom' && (
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter custom reason..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                disabled={loading}
                            />
                        )}
                    </div>
                </div>
                
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || quantity <= 0 || quantity > item.stock_quantity || (reason === 'custom' && !customReason.trim())}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Confirm Pull Out'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ExpiredProducts() {
    const { auth } = usePage().props as any;
    const [expiredItems, setExpiredItems] = useState<ExpiringItem[]>([]);
    const [summary, setSummary] = useState<ExpirationSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'expiry_date' | 'name' | 'category'>('expiry_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null);
    const [exporting, setExporting] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ExpiringItem | null>(null);
    const [showPullOutModal, setShowPullOutModal] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [filteredItems, setFilteredItems] = useState<ExpiringItem[]>([]);

    const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
        setNotification({ type, message });
    };

    const fetchExpiredItems = async () => {
        setLoading(true);
        try {
            const response = await inventoryService.getItems({ 
                per_page: 1000,
                status: 'active'
            });
            
            if (response.success) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const onlyExpired = (response.data || [])
                    .filter((item: any) => {
                        if (!item.expiry_date) return false;
                        const expiryDate = new Date(item.expiry_date);
                        expiryDate.setHours(0, 0, 0, 0);
                        return expiryDate < today;
                    })
                    .map((item: any) => {
                        const expiryDate = new Date(item.expiry_date);
                        expiryDate.setHours(0, 0, 0, 0);
                        const diffTime = today.getTime() - expiryDate.getTime();
                        const daysExpired = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        return {
                            id: item.id,
                            name: item.name,
                            sku: item.sku,
                            batch_number: item.batch_number,
                            expiry_date: item.expiry_date,
                            days_until_expiry: -daysExpired,
                            stock_quantity: item.stock_quantity,
                            category: item.category?.name || 'N/A',
                            supplier: item.supplier?.name || 'N/A',
                            price: item.price,
                            minimum_stock: item.minimum_stock
                        };
                    });
                
                setExpiredItems(onlyExpired);
                
                const totalStock = onlyExpired.reduce((sum: number, item: any) => sum + item.stock_quantity, 0);
                
                setSummary({
                    total_expiring_items: onlyExpired.length,
                    total_expiring_stock: totalStock,
                    check_date_range: 'All expired products',
                    expired_items: onlyExpired.length
                });
            } else {
                throw new Error(response.message || 'Failed to fetch expired items');
            }
        } catch (error) {
            console.error('Error fetching expired items:', error);
            showNotification('error', error instanceof Error ? error.message : 'Failed to fetch expired products');
            setExpiredItems([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            generatePDF();
            showNotification('success', 'Expired products PDF exported successfully');
        } catch (error) {
            showNotification('error', 'Failed to export expired products data');
        } finally {
            setExporting(false);
        }
    };

    const handlePullOut = (item: ExpiringItem) => {
        setSelectedItem(item);
        setShowPullOutModal(true);
    };

    const confirmPullOut = async (quantity: number, reason: string) => {
        if (!selectedItem) return;
        
        try {
            const adjustmentData = {
                type: 'out',
                quantity: quantity,
                reason: reason,
                reference_number: `PULLOUT-${Date.now()}`,
                notes: `Force pull out: ${reason} - Expired on ${formatDate(selectedItem.expiry_date)}`
            };
            
            const response = await inventoryService.adjustStock(selectedItem.id, adjustmentData);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to process pull out');
            }
            
            showNotification('success', `Successfully pulled out ${quantity} units of ${selectedItem.name}`);
            
            await fetchExpiredItems();
            
            setSelectedItem(null);
        } catch (error) {
            console.error('Error processing pull out:', error);
            showNotification('error', error instanceof Error ? error.message : 'Failed to process pull out. Please try again.');
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
                <title>Expired Products Report</title>
                <style>
                    @page {
                        size: A4;
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
                        color: #00c951;
                        font-size: 28pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }

                    .header h1 {
                        color: #333;
                        font-size: 20pt;
                        font-weight: bold;
                        margin-bottom: 10px;
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
                        background: #fee2e2;
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
                        border: 1px solid #b91c1c;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 9pt;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #fef2f2;
                    }
                    
                    tbody tr:hover {
                        background: #fee2e2;
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
                    
                    .footer-left {
                        text-align: left;
                    }
                    
                    .footer-right {
                        text-align: right;
                    }
                    
                    .footer strong {
                        color: #dc2626;
                    }
                    
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                        
                        .no-print {
                            display: none;
                        }
                        
                        .page-break {
                            page-break-after: always;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="company-name">H2-MED Enterprises</div>
                        <h1>EXPIRED PRODUCTS REPORT</h1>
                        <div class="subtitle">Complete list of products past their expiration date</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> All Time</div>
                            <div><strong>Generated by:</strong> ${auth.user?.name || 'User'}</div>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Expired Items</div>
                            <div class="value">${filteredItems.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Total Expired Stock</div>
                            <div class="value">${totalExpiredStock.toLocaleString()}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Estimated Loss</div>
                            <div class="value">₱${totalExpiredValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                    </div>
                    
                    ${filteredItems.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%;">#</th>
                                    <th style="width: 15%;">SKU</th>
                                    <th style="width: 25%;">Product Name</th>
                                    <th style="width: 12%;">Batch Number</th>
                                    <th style="width: 12%;">Expired Date</th>
                                    <th style="width: 10%;">Stock Qty</th>
                                    <th style="width: 12%;">Category</th>
                                    <th style="width: 12%;">Supplier</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredItems.map((item, index) => `
                                    <tr>
                                        <td style="text-align: center;">${index + 1}</td>
                                        <td style="font-family: monospace; font-size: 8pt;">${item.sku}</td>
                                        <td><strong>${item.name}</strong></td>
                                        <td style="font-family: monospace; font-size: 8pt;">${item.batch_number || '-'}</td>
                                        <td style="color: #dc2626; font-weight: bold;">${formatDate(item.expiry_date)}</td>
                                        <td style="text-align: right;">${item.stock_quantity.toLocaleString()} units</td>
                                        <td>${item.category}</td>
                                        <td>${item.supplier}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No expired products found</p>
                            <p>All products are within their expiration dates</p>
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

    const getDaysSinceExpiry = (daysUntilExpiry: number): number => {
        return Math.abs(daysUntilExpiry);
    };

    useEffect(() => {
        let filtered = expiredItems.filter(item => {
            return !searchTerm || 
                   item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (item.batch_number && item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                   item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
        });

        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'expiry_date':
                    aValue = new Date(a.expiry_date);
                    bValue = new Date(b.expiry_date);
                    break;
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'category':
                    aValue = a.category.toLowerCase();
                    bValue = b.category.toLowerCase();
                    break;
                default:
                    aValue = a.expiry_date;
                    bValue = b.expiry_date;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredItems(filtered);
        setCurrentPage(1);
    }, [expiredItems, searchTerm, sortBy, sortOrder]);

    const totalExpiredStock = filteredItems.reduce((sum, item) => sum + item.stock_quantity, 0);
    const totalExpiredValue = filteredItems.reduce((sum, item) => sum + (item.stock_quantity * item.price), 0);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, endIndex);

    const pagination = {
        current_page: currentPage,
        last_page: totalPages,
        per_page: itemsPerPage,
        total: filteredItems.length,
        from: startIndex + 1,
        to: Math.min(endIndex, filteredItems.length)
    };

    useEffect(() => {
        fetchExpiredItems();
    }, []);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        
        const pages = [];
        const maxPages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button 
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-4 py-2 mx-1 rounded-lg font-medium transition-all ${
                        i === currentPage ? 
                        'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 
                        'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return (
            <div className="flex justify-between items-center mt-6 px-6 pb-6">
                <div className="text-sm text-gray-600">
                    Showing {pagination.from} to {pagination.to} of {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </button>
                    
                    {pages}
                    
                    <button 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="container mx-auto px-6 py-8">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center mb-6 md:mb-0">
                            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-2xl mr-4 shadow-lg">
                                <AlertCircle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900">Expired Products</h1>
                                <p className="text-gray-600 mt-1">All products that have passed their expiration date</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button 
                                onClick={handleExport}
                                disabled={exporting || currentItems.length === 0}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {exporting ? (
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                ) : (
                                    <Download className="h-5 w-5 mr-2" />
                                )}
                                Export PDF
                            </button>
                            <button 
                                onClick={fetchExpiredItems}
                                disabled={loading}
                                className="inline-flex items-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <StatsCard
                                title="Total Expired Items"
                                value={filteredItems.length}
                                subtitle="Products past expiry"
                                icon={Package}
                                color="bg-gradient-to-r from-red-500 to-red-600"
                            />
                            <StatsCard
                                title="Total Expired Stock"
                                value={totalExpiredStock.toLocaleString()}
                                subtitle="Units to dispose"
                                icon={TrendingDown}
                                color="bg-gradient-to-r from-orange-500 to-red-500"
                            />
                            <StatsCard
                                title="Total Value Lost"
                                value={`₱${totalExpiredValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                                subtitle="Estimated loss"
                                icon={PesoIcon}
                                color="bg-gradient-to-r from-red-600 to-red-700"
                            />
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder="Search by name, SKU, batch, category..."
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">Sort by:</label>
                                <select
                                    value={`${sortBy}_${sortOrder}`}
                                    onChange={(e) => {
                                        const [column, order] = e.target.value.split('_');
                                        setSortBy(column as typeof sortBy);
                                        setSortOrder(order as 'asc' | 'desc');
                                    }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                >
                                    <option value="expiry_date_asc">Expiry Date (Oldest)</option>
                                    <option value="expiry_date_desc">Expiry Date (Most Recent)</option>
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="name_desc">Name (Z-A)</option>
                                    <option value="category_asc">Category (A-Z)</option>
                                    <option value="category_desc">Category (Z-A)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Batch Info</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Expired Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock Quantity</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
                                                </div>
                                                <p className="text-gray-500 mt-2">Loading expired products...</p>
                                            </td>
                                        </tr>
                                    ) : currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <CheckCircle className="h-12 w-12 text-green-300 mb-4" />
                                                    <p className="text-lg font-medium">No expired products found</p>
                                                    <p className="text-sm">All products are within their expiration dates</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-red-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                                                            <Package className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {item.batch_number ? (
                                                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                                                                <QrCode className="h-3 w-3 mr-1" />
                                                                {item.batch_number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">No Batch</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-red-600">
                                                        {formatDate(item.expiry_date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.stock_quantity.toLocaleString()} units
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-900">
                                                        <Tag className="h-4 w-4 mr-1 text-gray-400" />
                                                        {item.category}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-900">
                                                        <Truck className="h-4 w-4 mr-1 text-gray-400" />
                                                        {item.supplier}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handlePullOut(item)}
                                                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md"
                                                    >
                                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                                        Force Pull Out
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
                </div>
            </div>

            <PullOutModal
                isOpen={showPullOutModal}
                onClose={() => {
                    setShowPullOutModal(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                onConfirm={confirmPullOut}
            />

            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </AppLayout>
    );
}