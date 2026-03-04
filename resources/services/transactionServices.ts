// services/transactionServices.ts

// ===== INTERFACES =====
export interface TransactionItem {
    id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_rate?: number;
    discount_amount?: number;
    is_senior_citizen?: boolean;
    is_pwd?: boolean;
    inventoryItem?: {
        id: number;
        name: string;
        sku: string;
        price: number;
    };
}

export interface Transaction {
    id: number;
    receipt_number: string;
    customer_name?: string;
    subtotal: number;
    vat: number;
    total: number;
    discount_rate?: number;
    discount_amount?: number;
    payment_method: 'cash' | 'card' | 'gcash';
    cash_amount?: number;
    change_amount?: number;
    status: 'completed' | 'cancelled' | 'pending';
    is_senior_citizen?: boolean;
    is_pwd?: boolean;
    created_at: string;
    updated_at: string;
    user_id?: number;
    user?: {
        id: number;
        name: string;
    };
    items: TransactionItem[];
}

export interface TransactionStats {
    total_transactions: number;
    total_sales: number;
    total_items_sold: number;
    average_transaction_value: number;
    daily_sales: Array<{
        date: string;
        transactions: number;
        total_sales: number;
    }>;
    payment_methods: Array<{
        payment_method: string;
        count: number;
        total_amount: number;
    }>;
    top_selling_items: Array<{
        inventory_item_id: number;
        inventoryItem: {
            id: number;
            name: string;
            sku: string;
        };
        total_quantity: number;
        total_revenue: number;
    }>;
}

export interface SalesReportData {
    date: string;
    transactions: number;
    total_sales: number;
}

export interface PaymentMethodData {
    payment_method: string;
    count: number;
    total_amount: number;
}

export interface DiscountAnalysisData {
    discount_type: string;
    count: number;
    total_discount: number;
    total_sales: number;
}

export interface TopSellingItemData {
    inventory_item_id: number;
    inventoryItem: {
        id: number;
        name: string;
        sku: string;
    };
    total_quantity: number;
    total_revenue: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, unknown>;
    pagination?: PaginationData;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
    pagination: PaginationData;
}

export interface TransactionFilters {
    search?: string;
    payment_method?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    discount_type?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

// ===== SERVICE CLASS =====
class TransactionService {
    private baseURL = '/api/transactions';

    private async request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const defaultOptions: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers,
            },
            credentials: 'same-origin',
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('Unexpected response format:', text);
                throw new Error('Unexpected response format from server');
            }

            if (!response.ok) {
                if (data.errors) {
                    const errorMessages = Object.entries(data.errors)
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                        .join('; ');
                    throw new Error(errorMessages || data.message || `Request failed with status ${response.status}`);
                }
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Get all transactions with filters and pagination
    async getTransactions(filters: TransactionFilters = {}): Promise<PaginatedApiResponse<Transaction[]>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            const url = `${this.baseURL}?${searchParams.toString()}`;
            const response = await this.request<Transaction[]>(url);
            
            return {
                success: response.success || true,
                data: Array.isArray(response.data) ? response.data : [],
                message: response.message,
                errors: response.errors,
                pagination: response.pagination || {
                    current_page: 1,
                    last_page: 1,
                    per_page: Array.isArray(response.data) ? response.data.length : 0,
                    total: Array.isArray(response.data) ? response.data.length : 0,
                    from: 1,
                    to: Array.isArray(response.data) ? response.data.length : 0
                }
            };
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return {
                success: false,
                data: [],
                message: 'Failed to fetch transactions',
                errors: error instanceof Error ? { message: error.message } : { error: String(error) },
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 0,
                    total: 0,
                    from: 0,
                    to: 0
                }
            };
        }
    }

    // Get a single transaction by ID
    async getTransaction(id: number): Promise<ApiResponse<Transaction>> {
        try {
            return await this.request<Transaction>(`${this.baseURL}/${id}`);
        } catch (error) {
            console.error('Error fetching transaction:', error);
            throw error;
        }
    }

    // Get transaction statistics
    async getStats(filters: { date_from?: string; date_to?: string } = {}): Promise<ApiResponse<TransactionStats>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            const url = `${this.baseURL}/stats?${searchParams.toString()}`;
            const response = await this.request<TransactionStats>(url);
            
            const defaultStats: TransactionStats = {
                total_transactions: 0,
                total_sales: 0,
                total_items_sold: 0,
                average_transaction_value: 0,
                daily_sales: [],
                payment_methods: [],
                top_selling_items: []
            };
            
            return {
                success: response.success || true,
                data: response.data || defaultStats,
                message: response.message,
                errors: response.errors
            };
        } catch (error) {
            console.error('Error fetching transaction stats:', error);
            return {
                success: false,
                data: {
                    total_transactions: 0,
                    total_sales: 0,
                    total_items_sold: 0,
                    average_transaction_value: 0,
                    daily_sales: [],
                    payment_methods: [],
                    top_selling_items: []
                },
                message: 'Failed to fetch transaction statistics',
                errors: error instanceof Error ? { message: error.message } : { error: String(error) }
            };
        }
    }

    // Get transactions with discounts
    async getTransactionsWithDiscounts(filters: TransactionFilters = {}): Promise<PaginatedApiResponse<Transaction[]>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            const url = `${this.baseURL}/with-discounts?${searchParams.toString()}`;
            const response = await this.request<Transaction[]>(url);
            
            return {
                success: response.success || true,
                data: Array.isArray(response.data) ? response.data : [],
                message: response.message,
                errors: response.errors,
                pagination: response.pagination || {
                    current_page: 1,
                    last_page: 1,
                    per_page: Array.isArray(response.data) ? response.data.length : 0,
                    total: Array.isArray(response.data) ? response.data.length : 0,
                    from: 1,
                    to: Array.isArray(response.data) ? response.data.length : 0
                }
            };
        } catch (error) {
            console.error('Error fetching discounted transactions:', error);
            return {
                success: false,
                data: [],
                message: 'Failed to fetch discounted transactions',
                errors: error instanceof Error ? { message: error.message } : { error: String(error) },
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 0,
                    total: 0,
                    from: 0,
                    to: 0
                }
            };
        }
    }

    // Void/cancel a transaction
    async voidTransaction(id: number, reason: string): Promise<ApiResponse<Transaction>> {
        try {
            return await this.request<Transaction>(`${this.baseURL}/${id}/void`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
            });
        } catch (error) {
            console.error('Error voiding transaction:', error);
            throw error;
        }
    }

    // Export transactions to CSV
    async exportTransactions(filters: TransactionFilters = {}): Promise<Blob> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(`${this.baseURL}/export?${searchParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            return await response.blob();
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    }

    // Get daily sales report
    async getDailySalesReport(date?: string): Promise<ApiResponse<SalesReportData>> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            return await this.request<SalesReportData>(`${this.baseURL}/reports/daily?date=${targetDate}`);
        } catch (error) {
            console.error('Error fetching daily sales report:', error);
            throw error;
        }
    }

    // Get weekly sales report
    async getWeeklySalesReport(weekStart?: string): Promise<ApiResponse<SalesReportData>> {
        try {
            const searchParams = new URLSearchParams();
            if (weekStart) {
                searchParams.append('week_start', weekStart);
            }
            
            return await this.request<SalesReportData>(`${this.baseURL}/reports/weekly?${searchParams.toString()}`);
        } catch (error) {
            console.error('Error fetching weekly sales report:', error);
            throw error;
        }
    }

    // Get monthly sales report
    async getMonthlySalesReport(month?: string, year?: string): Promise<ApiResponse<SalesReportData>> {
        try {
            const searchParams = new URLSearchParams();
            if (month) searchParams.append('month', month);
            if (year) searchParams.append('year', year);
            
            return await this.request<SalesReportData>(`${this.baseURL}/reports/monthly?${searchParams.toString()}`);
        } catch (error) {
            console.error('Error fetching monthly sales report:', error);
            throw error;
        }
    }

    // Get top selling items
    async getTopSellingItems(filters: { date_from?: string; date_to?: string; limit?: number } = {}): Promise<ApiResponse<TopSellingItemData[]>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            return await this.request<TopSellingItemData[]>(`${this.baseURL}/reports/top-selling?${searchParams.toString()}`);
        } catch (error) {
            console.error('Error fetching top selling items:', error);
            throw error;
        }
    }

    // Get payment method analysis
    async getPaymentMethodAnalysis(filters: { date_from?: string; date_to?: string } = {}): Promise<ApiResponse<PaymentMethodData[]>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            return await this.request<PaymentMethodData[]>(`${this.baseURL}/reports/payment-methods?${searchParams.toString()}`);
        } catch (error) {
            console.error('Error fetching payment method analysis:', error);
            throw error;
        }
    }

    // Get discount analysis
    async getDiscountAnalysis(filters: { date_from?: string; date_to?: string } = {}): Promise<ApiResponse<DiscountAnalysisData[]>> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            return await this.request<DiscountAnalysisData[]>(`${this.baseURL}/reports/discounts?${searchParams.toString()}`);
        } catch (error) {
            console.error('Error fetching discount analysis:', error);
            throw error;
        }
    }

    // Utility functions
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatShortDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric'
        });
    }

    getPaymentMethodLabel(method: string): string {
        const labels: { [key: string]: string } = {
            cash: 'Cash',
            card: 'Card',
            gcash: 'GCash'
        };
        return labels[method] || method;
    }

    getStatusLabel(status: string): string {
        const labels: { [key: string]: string } = {
            completed: 'Completed',
            cancelled: 'Cancelled',
            pending: 'Pending'
        };
        return labels[status] || status;
    }

    getDiscountTypeLabel(transaction: Transaction): string | null {
        if (transaction.is_senior_citizen) {
            return 'Senior Citizen (20%)';
        }
        if (transaction.is_pwd) {
            return 'PWD (20%)';
        }
        if (transaction.discount_rate && transaction.discount_rate > 0) {
            return `General Discount (${(transaction.discount_rate * 100).toFixed(1)}%)`;
        }
        return null;
    }

    calculateDiscountSavings(transaction: Transaction): number {
        return transaction.discount_amount || 0;
    }

    // Validation functions
    validateFilters(filters: TransactionFilters): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (filters.date_from && filters.date_to) {
            const fromDate = new Date(filters.date_from);
            const toDate = new Date(filters.date_to);
            
            if (fromDate > toDate) {
                errors.push('Date from cannot be later than date to');
            }
        }

        if (filters.per_page && (filters.per_page < 1 || filters.per_page > 100)) {
            errors.push('Items per page must be between 1 and 100');
        }

        if (filters.page && filters.page < 1) {
            errors.push('Page number must be greater than 0');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Download exported file
    downloadFile(blob: Blob, filename: string): void {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Generate filename for exports
    generateExportFilename(prefix: string = 'transactions'): string {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${prefix}_${dateStr}_${timeStr}.csv`;
    }

    // Calculate transaction summary
    calculateTransactionSummary(transactions: Transaction[]): {
        totalTransactions: number;
        totalSales: number;
        totalItems: number;
        totalDiscounts: number;
        averageTransaction: number;
    } {
        if (!transactions || transactions.length === 0) {
            return {
                totalTransactions: 0,
                totalSales: 0,
                totalItems: 0,
                totalDiscounts: 0,
                averageTransaction: 0
            };
        }

        const totalTransactions = transactions.length;
        const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
        const totalItems = transactions.reduce((sum, t) => sum + (t.items?.length || 0), 0);
        const totalDiscounts = transactions.reduce((sum, t) => sum + (t.discount_amount || 0), 0);
        const averageTransaction = totalSales / totalTransactions;

        return {
            totalTransactions,
            totalSales,
            totalItems,
            totalDiscounts,
            averageTransaction
        };
    }

    // Group transactions by date
    groupTransactionsByDate(transactions: Transaction[]): { [date: string]: Transaction[] } {
        return transactions.reduce((groups, transaction) => {
            const date = transaction.created_at.split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(transaction);
            return groups;
        }, {} as { [date: string]: Transaction[] });
    }

    // Filter transactions by date range
    filterByDateRange(transactions: Transaction[], dateFrom?: string, dateTo?: string): Transaction[] {
        if (!dateFrom && !dateTo) return transactions;

        return transactions.filter(transaction => {
            const transactionDate = transaction.created_at.split('T')[0];
            
            if (dateFrom && transactionDate < dateFrom) return false;
            if (dateTo && transactionDate > dateTo) return false;
            
            return true;
        });
    }
}

export const transactionService = new TransactionService();