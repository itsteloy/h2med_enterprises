import AppLayout from '@/layouts/app-layout';
import { Search, Filter, Eye, Download, Receipt, List, User, CreditCard, Package, ArrowUpDown, ChevronLeft, ChevronRight, X, FileText, ShoppingCart, Clock, DollarSign, Percent, UserCheck, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { transactionService, Transaction, TransactionStats, TransactionFilters } from '../../../services/transactionServices';

interface TransactionItem {
    id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    inventoryItem?: {
        id: number;
        name: string;
        sku: string;
        price: number;
    };
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface UserData {
    id: number;
    name: string;
    email: string;
    role: string;
}

export default function PurchaseList() {
    const { auth } = usePage().props as any;
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedUser, setSelectedUser] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0
    });
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
        
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'cash':
                return <DollarSign className="h-4 w-4" />;
            case 'card':
                return <CreditCard className="h-4 w-4" />;
            case 'gcash':
                return <FileText className="h-4 w-4" />;
            default:
                return <DollarSign className="h-4 w-4" />;
        }
    };

    const getDiscountInfo = (transaction: Transaction) => {
        if (transaction.is_senior_citizen) {
            return { type: 'Senior Citizen', rate: 20, icon: <UserCheck className="h-4 w-4" /> };
        }
        if (transaction.is_pwd) {
            return { type: 'PWD', rate: 20, icon: <Users className="h-4 w-4" /> };
        }
        if (transaction.discount_rate && transaction.discount_rate > 0) {
            return { type: 'General', rate: transaction.discount_rate * 100, icon: <Percent className="h-4 w-4" /> };
        }
        return null;
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const filters: TransactionFilters = {
                page: currentPage,
                per_page: perPage,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...(searchTerm && { search: searchTerm }),
                ...(selectedPaymentMethod !== 'all' && { payment_method: selectedPaymentMethod }),
                ...(selectedStatus !== 'all' && { status: selectedStatus }),
                ...(selectedUser !== 'all' && { user_id: parseInt(selectedUser) }),
                ...(dateFrom && { date_from: dateFrom }),
                ...(dateTo && { date_to: dateTo })
            };

            console.log('Fetching transactions with filters:', filters);

            const response = await transactionService.getTransactions(filters);
            
            console.log('Transaction response:', response);

            if (response.success) {
                let filteredData = response.data || [];
                
                // Additional client-side filtering as a safeguard
                if (selectedUser !== 'all') {
                    const userId = parseInt(selectedUser);
                    filteredData = filteredData.filter(t => t.user?.id === userId || t.user_id === userId);
                    console.log(`Filtered ${response.data?.length} transactions to ${filteredData.length} for user ID ${userId}`);
                }
                
                setTransactions(filteredData);
                setPagination(response.pagination || pagination);
            } else {
                throw new Error(response.message || 'Failed to fetch transactions');
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showNotification('error', 'Failed to fetch transactions');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const filters = {
                ...(dateFrom && { date_from: dateFrom }),
                ...(dateTo && { date_to: dateTo }),
                ...(selectedUser !== 'all' && { user_id: parseInt(selectedUser) })
            };

            const response = await transactionService.getStats(filters);
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchAllTransactionsForExport = async (): Promise<Transaction[]> => {
        try {
            const filters: TransactionFilters = {
                page: 1,
                per_page: 999999, // Get all transactions
                sort_by: sortBy,
                sort_order: sortOrder,
                ...(searchTerm && { search: searchTerm }),
                ...(selectedPaymentMethod !== 'all' && { payment_method: selectedPaymentMethod }),
                ...(selectedStatus !== 'all' && { status: selectedStatus }),
                ...(selectedUser !== 'all' && { user_id: parseInt(selectedUser) }),
                ...(dateFrom && { date_from: dateFrom }),
                ...(dateTo && { date_to: dateTo })
            };

            console.log('Fetching all transactions for export with filters:', filters);

            const response = await transactionService.getTransactions(filters);
            
            if (response.success) {
                let allData = response.data || [];
                
                // Additional client-side filtering as a safeguard
                if (selectedUser !== 'all') {
                    const userId = parseInt(selectedUser);
                    allData = allData.filter(t => t.user?.id === userId || t.user_id === userId);
                    console.log(`Export filtered to ${allData.length} transactions for user ID ${userId}`);
                }
                
                return allData;
            } else {
                throw new Error(response.message || 'Failed to fetch transactions');
            }
        } catch (error) {
            console.error('Error fetching all transactions:', error);
            throw error;
        }
    };

    const exportTransactions = async () => {
        if (isExporting) return;
        
        try {
            setIsExporting(true);
            showNotification('success', 'Preparing PDF export...');
            
            // Fetch all transactions with current filters
            const allTransactions = await fetchAllTransactionsForExport();
            
            if (allTransactions.length === 0) {
                showNotification('error', 'No transactions to export');
                return;
            }
            
            generatePDF(allTransactions);
            showNotification('success', 'Transactions PDF exported successfully');
        } catch (error) {
            console.error('Error exporting transactions:', error);
            showNotification('error', 'Failed to export transactions');
        } finally {
            setIsExporting(false);
        }
    };

    const generatePDF = (allTransactions: Transaction[]) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const currentUser = auth.user?.name || 'User';

        const totalAmount = allTransactions.reduce((sum, t) => sum + t.total, 0);
        const completedTransactions = allTransactions.filter(t => t.status === 'completed');
        const totalCompleted = completedTransactions.reduce((sum, t) => sum + t.total, 0);

        let dateRangeText = 'All Time';
        if (dateFrom && dateTo) {
            const fromDate = new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const toDate = new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateRangeText = `${fromDate} to ${toDate}`;
        } else if (dateFrom) {
            const fromDate = new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateRangeText = `From ${fromDate}`;
        } else if (dateTo) {
            const toDate = new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateRangeText = `Until ${toDate}`;
        }

        // Get filtered user name
        let userFilterText = 'All Users';
        let selectedUserName = '';
        if (selectedUser !== 'all') {
            const user = users.find(u => u.id === parseInt(selectedUser));
            userFilterText = user ? user.name : 'Unknown User';
            selectedUserName = user ? user.name : '';
        }

        // Get status filter text
        let statusFilterText = '';
        if (selectedStatus !== 'all') {
            statusFilterText = selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
        }

        // Get payment method filter text
        let paymentFilterText = '';
        if (selectedPaymentMethod !== 'all') {
            paymentFilterText = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Purchase List Report${selectedUserName ? ` - ${selectedUserName}` : ''}</title>
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
                        font-size: 10pt;
                        margin-bottom: 10px;
                        font-weight: ${selectedUserName ? 'bold' : 'normal'};
                    }
                    
                    .header .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 8pt;
                        color: #666;
                        padding: 0 20px;
                    }
                    
                    .filter-info {
                        background: #fff3cd;
                        border: 2px solid #ffc107;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 20px;
                        text-align: center;
                        font-weight: bold;
                        color: #856404;
                    }
                    
                    .summary {
                        background: #dcfce7;
                        border: 2px solid #00c951;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
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
                        padding: 15px 20mm;
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
                    
                    .status-badge {
                        display: inline-block;
                        padding: 3px 10px;
                        border-radius: 10px;
                        font-size: 7pt;
                        font-weight: bold;
                    }
                    
                    .status-completed {
                        background: #dcfce7;
                        color: #166534;
                    }
                    
                    .status-cancelled {
                        background: #fee2e2;
                        color: #991b1b;
                    }
                    
                    .status-pending {
                        background: #fef3c7;
                        color: #92400e;
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
                        <h1>PURCHASE LIST REPORT</h1>
                        <div class="subtitle">${selectedUserName ? `Sales Report for ${selectedUserName}` : 'Complete Transaction History'}</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> ${dateRangeText}</div>
                            <div><strong>User Filter:</strong> ${userFilterText}</div>
                            <div><strong>Generated by:</strong> ${currentUser}</div>
                        </div>
                    </div>
                    
                    ${(dateFrom || dateTo || selectedUser !== 'all' || selectedPaymentMethod !== 'all' || selectedStatus !== 'all') ? `
                        <div class="filter-info">
                            📊 Filtered Results: ${dateRangeText}${selectedUser !== 'all' ? ` • User: ${userFilterText}` : ''}${paymentFilterText ? ` • Payment: ${paymentFilterText}` : ''}${statusFilterText ? ` • Status: ${statusFilterText}` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Transactions</div>
                            <div class="value">${allTransactions.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Completed Sales</div>
                            <div class="value">${completedTransactions.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Total Amount</div>
                            <div class="value">₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Completed Amount</div>
                            <div class="value">₱${totalCompleted.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                    </div>
                    
                    ${allTransactions.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 12%;">Receipt #</th>
                                    <th style="width: 15%;">Customer</th>
                                    <th style="width: 10%;">Total</th>
                                    <th style="width: 10%;">Payment</th>
                                    <th style="width: 15%;">Discount</th>
                                    <th style="width: 10%;">Status</th>
                                    <th style="width: 13%;">Date</th>
                                    <th style="width: 15%;">Cashier</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allTransactions.map((transaction) => {
                                    let discountInfo = '';
                                    if (transaction.is_senior_citizen) {
                                        discountInfo = 'Senior (20%)';
                                    } else if (transaction.is_pwd) {
                                        discountInfo = 'PWD (20%)';
                                    } else if (transaction.discount_rate && transaction.discount_rate > 0) {
                                        discountInfo = 'General (' + (transaction.discount_rate * 100).toFixed(0) + '%)';
                                    } else {
                                        discountInfo = 'No discount';
                                    }
                                    
                                    return `
                                        <tr>
                                            <td style="font-family: monospace; font-weight: bold;">${transaction.receipt_number}</td>
                                            <td>${transaction.customer_name || 'Walk-in Customer'}</td>
                                            <td style="text-align: right; font-weight: bold;">₱${transaction.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td style="text-transform: capitalize;">${transaction.payment_method}</td>
                                            <td style="font-size: 7pt;">${discountInfo}</td>
                                            <td>
                                                <span class="status-badge status-${transaction.status}">
                                                    ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                                </span>
                                            </td>
                                            <td style="font-size: 7pt;">${new Date(transaction.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>${transaction.user?.name || 'Unknown'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No transactions found for the selected filters</p>
                        </div>
                    `}
                    
                    <div class="footer">
                        <div class="footer-content">
                            <div>
                                <strong>H2-MED Enterprises</strong> | Pharmacy Sales System<br>
                                Generated on: ${new Date().toLocaleString('en-US')}
                            </div>
                            <div style="text-align: right;">
                                <strong>CONFIDENTIAL</strong><br>
                                Total Records: ${allTransactions.length}
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

    const viewTransaction = async (id: number) => {
        try {
            const response = await transactionService.getTransaction(id);
            if (response.success) {
                setSelectedTransaction(response.data);
                setShowTransactionModal(true);
            }
        } catch (error) {
            console.error('Error fetching transaction:', error);
            showNotification('error', 'Failed to fetch transaction details');
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedPaymentMethod('all');
        setSelectedStatus('all');
        setSelectedUser('all');
        setDateFrom('');
        setDateTo('');
        setSortBy('created_at');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    const hasActiveFilters = () => {
        return searchTerm !== '' || 
               selectedPaymentMethod !== 'all' || 
               selectedStatus !== 'all' || 
               selectedUser !== 'all' ||
               dateFrom !== '' || 
               dateTo !== '';
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchTransactions();
        fetchStats();
    }, [currentPage, perPage, sortBy, sortOrder, selectedPaymentMethod, selectedStatus, selectedUser, dateFrom, dateTo]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            fetchTransactions();
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const TransactionModal = () => {
        if (!showTransactionModal || !selectedTransaction) return null;

        const discountInfo = getDiscountInfo(selectedTransaction);

        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                         onClick={() => setShowTransactionModal(false)}></div>
                    
                    <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                        <div className="bg-[#00c951] px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                                <button 
                                    onClick={() => setShowTransactionModal(false)} 
                                    className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-[80vh] overflow-y-auto">
                            <div className="mb-6 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Receipt Number</p>
                                    <p className="font-semibold">{selectedTransaction.receipt_number}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Date & Time</p>
                                    <p className="font-semibold">{transactionService.formatDate(selectedTransaction.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Customer</p>
                                    <p className="font-semibold">{selectedTransaction.customer_name || 'Walk-in Customer'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Cashier</p>
                                    <p className="font-semibold">{selectedTransaction.user?.name || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Payment Method</p>
                                    <div className="flex items-center">
                                        {getPaymentMethodIcon(selectedTransaction.payment_method)}
                                        <span className="ml-2 font-semibold capitalize">{selectedTransaction.payment_method}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                                </div>
                            </div>

                            {discountInfo && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-center">
                                        {discountInfo.icon}
                                        <h3 className="ml-2 text-sm font-medium text-blue-800">
                                            {discountInfo.type} Discount ({discountInfo.rate}%)
                                        </h3>
                                    </div>
                                    {selectedTransaction.discount_amount && (
                                        <p className="mt-1 text-sm text-blue-600">
                                            Discount Amount: {transactionService.formatCurrency(selectedTransaction.discount_amount)}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-4">Items</h3>
                                <div className="space-y-3">
                                    {selectedTransaction.items.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-[#00c951] rounded-lg flex items-center justify-center mr-3">
                                                    <Package className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900">
                                                        {item.inventoryItem?.name || item.name || 'Unknown Product'}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">SKU: {item.inventoryItem?.sku || item.sku || 'N/A'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {item.quantity} × {transactionService.formatCurrency(item.unit_price)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">{transactionService.formatCurrency(item.total_price)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal:</span>
                                        <span>{transactionService.formatCurrency(selectedTransaction.subtotal)}</span>
                                    </div>
                                    
                                    {selectedTransaction.discount_amount && selectedTransaction.discount_amount > 0 && (
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span>Discount:</span>
                                            <span>-{transactionService.formatCurrency(selectedTransaction.discount_amount)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between text-sm">
                                        <span>VAT (12%):</span>
                                        <span>{transactionService.formatCurrency(selectedTransaction.vat)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                                        <span>Total:</span>
                                        <span className="text-[#00c951]">{transactionService.formatCurrency(selectedTransaction.total)}</span>
                                    </div>
                                </div>

                                {selectedTransaction.payment_method === 'cash' && selectedTransaction.cash_amount && (
                                    <div className="mt-4 pt-4 border-t space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Cash Received:</span>
                                            <span>{transactionService.formatCurrency(selectedTransaction.cash_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Change:</span>
                                            <span>{transactionService.formatCurrency(selectedTransaction.change_amount || 0)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 p-6 pt-0">
                            <button
                                onClick={() => setShowTransactionModal(false)}
                                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const Notification = () => {
        if (!notification) return null;

        const bgColor = notification.type === 'success' 
            ? 'bg-[#00c951]' 
            : 'bg-gradient-to-r from-red-500 to-red-600';
        
        return (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
                <div className={`${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm`}>
                    <div className="flex items-center justify-between">
                        <div className="font-medium">{notification.message}</div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
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
                                <List className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Purchase List</h1>
                                <p className="text-gray-600 mt-1">View and manage all transactions</p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <Link 
                                href="/admin/pos" 
                                className="inline-flex items-center px-6 py-3 bg-[#00c951] text-white rounded-xl hover:bg-[#00b048] transition-all shadow-sm font-medium"
                            >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Point of Sale
                            </Link>
                            <button
                                onClick={exportTransactions}
                                disabled={transactions.length === 0 || isExporting}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-5 w-5 mr-2" />
                                        Export PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                <div className="text-sm font-medium text-gray-500 mb-2">Total Transactions</div>
                                <div className="text-3xl font-bold text-blue-600">{stats.total_transactions.toLocaleString()}</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                <div className="text-sm font-medium text-gray-500 mb-2">Total Sales</div>
                                <div className="text-3xl font-bold text-[#00c951]">{transactionService.formatCurrency(stats.total_sales)}</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                <div className="text-sm font-medium text-gray-500 mb-2">Items Sold</div>
                                <div className="text-3xl font-bold text-orange-600">{stats.total_items_sold.toLocaleString()}</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                <div className="text-sm font-medium text-gray-500 mb-2">Avg Transaction</div>
                                <div className="text-3xl font-bold text-purple-600">{transactionService.formatCurrency(stats.average_transaction_value)}</div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                        placeholder="Search by receipt number or customer name..."
                                    />
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`inline-flex items-center px-4 py-3 rounded-xl transition-all ${
                                        hasActiveFilters() 
                                            ? 'bg-[#00c951] text-white hover:bg-[#00b048]' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Filter className="h-5 w-5 mr-2" />
                                    Filters
                                    {hasActiveFilters() && (
                                        <span className="ml-2 bg-white text-[#00c951] rounded-full px-2 py-0.5 text-xs font-bold">
                                            Active
                                        </span>
                                    )}
                                </button>
                            </div>

                            {showFilters && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">User/Cashier</label>
                                            <select
                                                value={selectedUser}
                                                onChange={(e) => setSelectedUser(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent"
                                            >
                                                <option value="all">All Users</option>
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>{user.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                            <select
                                                value={selectedPaymentMethod}
                                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent"
                                            >
                                                <option value="all">All Methods</option>
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="gcash">GCash</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={clearFilters}
                                                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {hasActiveFilters() && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                                                {selectedUser !== 'all' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        User: {users.find(u => u.id === parseInt(selectedUser))?.name || 'Unknown'}
                                                    </span>
                                                )}
                                                {dateFrom && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        From: {new Date(dateFrom).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {dateTo && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        To: {new Date(dateTo).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {selectedPaymentMethod !== 'all' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Payment: {selectedPaymentMethod}
                                                    </span>
                                                )}
                                                {selectedStatus !== 'all' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Status: {selectedStatus}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('receipt_number')}
                                                className="flex items-center hover:text-gray-700"
                                            >
                                                Receipt #
                                                <ArrowUpDown className="ml-1 h-4 w-4" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('total')}
                                                className="flex items-center hover:text-gray-700"
                                            >
                                                Total
                                                <ArrowUpDown className="ml-1 h-4 w-4" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Payment
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Discount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSort('created_at')}
                                                className="flex items-center hover:text-gray-700"
                                            >
                                                Date
                                                <ArrowUpDown className="ml-1 h-4 w-4" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00c951]"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                {hasActiveFilters() ? 'No transactions found for the selected filters' : 'No transactions found'}
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((transaction) => {
                                            const discountInfo = getDiscountInfo(transaction);
                                            
                                            return (
                                                <tr key={transaction.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{transaction.receipt_number}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <User className="h-4 w-4 text-gray-400 mr-2" />
                                                            <div className="text-sm text-gray-900">
                                                                {transaction.customer_name || 'Walk-in Customer'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{transactionService.formatCurrency(transaction.total)}</div>
                                                        <div className="text-xs text-gray-500">{transaction.items.length} items</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <span className="ml-2 text-sm text-gray-900 capitalize">{transaction.payment_method}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {discountInfo ? (
                                                            <div className="flex items-center">
                                                                {discountInfo.icon}
                                                                <span className="ml-1 text-xs text-blue-600">
                                                                    {discountInfo.type} ({discountInfo.rate}%)
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">No discount</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(transaction.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{transactionService.formatDate(transaction.created_at)}</div>
                                                        <div className="text-xs text-gray-500">by {transaction.user?.name || 'Unknown'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => viewTransaction(transaction.id)}
                                                            className="inline-flex items-center px-3 py-2 bg-[#00c951] text-white rounded-lg hover:bg-[#00b048] transition-colors"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pagination.total > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {pagination.from} to {pagination.to} of {pagination.total} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.current_page - 1)}
                                        disabled={pagination.current_page <= 1}
                                        className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    
                                    <div className="flex space-x-1">
                                        {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`px-3 py-2 rounded-lg ${
                                                        pagination.current_page === pageNum
                                                            ? 'bg-[#00c951] text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button
                                        onClick={() => handlePageChange(pagination.current_page + 1)}
                                        disabled={pagination.current_page >= pagination.last_page}
                                        className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TransactionModal />
            <Notification />
        </AppLayout>
    );
}