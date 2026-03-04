// services/posServices.ts
// DEFENSE MINUTES FIX: Added senior_id, pwd_id fields and cashier stats

// ===== INTERFACES =====
export interface POSProduct {
    id: number;
    sku: string;
    name: string;
    price: number;
    stock_quantity: number;
    unit: string;
    images?: string[];
    category?: {
        id: number;
        name: string;
    };
    supplier?: {
        id: number;
        name: string;
    };
}

export interface TransactionItem {
    id: number;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface DiscountInfo {
    type: 'none' | 'senior' | 'pwd' | 'general';
    rate: number;
    amount: number;
}

export interface Transaction {
    id?: number;
    customer_name?: string;
    items: TransactionItem[];
    subtotal: number;
    discount?: DiscountInfo;
    discount_rate?: number;
    discount_amount?: number;
    discounted_subtotal?: number;
    vat: number;
    total: number;
    payment_method: 'cash' | 'card' | 'gcash';
    cash_amount?: number;
    change?: number;
    receipt_number?: string;
    created_at?: string;
    cashier_name?: string;
    is_senior_citizen?: boolean;
    senior_id?: string;  // DEFENSE MINUTES FIX: Added
    is_pwd?: boolean;
    pwd_id?: string;     // DEFENSE MINUTES FIX: Added
}

export interface POSStats {
    daily_sales: number;
    transactions_today: number;
    popular_items: Array<{
        id: number;
        name: string;
        sales_count: number;
    }>;
}

// DEFENSE MINUTES FIX: Added cashier-specific stats interface
export interface CashierStats {
    daily_sales: number;
    transactions_today: number;
    transactions_this_week: number;
    total_transactions: number;
    average_transaction: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, string | string[]>;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
    pagination: PaginationData;
}

export type POSProductResponse = PaginatedApiResponse<POSProduct[]>;

export interface HeldTransaction {
    id: number;
    customer_name?: string;
    items: TransactionItem[];
    subtotal: number;
    discount?: DiscountInfo;
    total: number;
    payment_method: 'cash' | 'card' | 'gcash';
    cash_amount?: number;
    held_at: string;
}

export interface SalesReport {
    date: string;
    total_sales: number;
    transaction_count: number;
    payment_breakdown: Record<string, number>;
}

export interface SalesSummary {
    period: string;
    total_sales: number;
    transaction_count: number;
    average_transaction: number;
}

export interface ValidationItem {
    id: number;
    quantity: number;
    price: number;
}

// ===== SERVICE CLASS =====
class POSService {
    private baseURL = '/api/pos';

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

        const response = await fetch(url, { ...defaultOptions, ...options });
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
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
    }

    private async paginatedRequest<T>(url: string, options: RequestInit = {}): Promise<PaginatedApiResponse<T>> {
        const response = await this.request<T>(url, options);
        
        const paginatedResponse = response as PaginatedApiResponse<T>;
        
        return {
            success: paginatedResponse.success || true,
            data: paginatedResponse.data,
            message: paginatedResponse.message,
            errors: paginatedResponse.errors,
            pagination: paginatedResponse.pagination || {
                current_page: 1,
                last_page: 1,
                per_page: Array.isArray(paginatedResponse.data) ? paginatedResponse.data.length : 0,
                total: Array.isArray(paginatedResponse.data) ? paginatedResponse.data.length : 0
            }
        };
    }

    // Get products for POS
    async getProducts(params: {
        search?: string;
        category_id?: number;
        per_page?: number;
    } = {}): Promise<POSProductResponse> {
        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, value.toString());
                }
            });

            const url = `${this.baseURL}/products?${searchParams.toString()}`;
            const response = await this.paginatedRequest<POSProduct[]>(url);
            
            return {
                success: response.success,
                data: Array.isArray(response.data) ? response.data : [],
                message: response.message,
                errors: response.errors,
                pagination: response.pagination
            };
        } catch (error) {
            console.error('Error fetching POS products:', error);
            return {
                success: false,
                data: [],
                message: 'Failed to fetch products',
                errors: error instanceof Error ? { error: error.message } : { error: 'Unknown error' },
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 0,
                    total: 0
                }
            };
        }
    }

    // Process transaction with discount support
    // DEFENSE MINUTES FIX: Added senior_id and pwd_id validation
    async processTransaction(transactionData: {
        customer_name?: string;
        items: Array<{
            id: number;
            quantity: number;
            price: number;
        }>;
        subtotal: number;
        discount_rate?: number;
        discount_amount?: number;
        total: number;
        payment_method: 'cash' | 'card' | 'gcash';
        cash_amount?: number;
        is_senior_citizen?: boolean;
        senior_id?: string;  // DEFENSE MINUTES FIX: Added
        is_pwd?: boolean;
        pwd_id?: string;     // DEFENSE MINUTES FIX: Added
    }): Promise<ApiResponse<Transaction>> {
        return this.request<Transaction>(`${this.baseURL}/transactions`, {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
    }

    // Get recent transactions
    async getRecentTransactions(): Promise<ApiResponse<Transaction[]>> {
        try {
            const response = await this.request<Transaction[]>(`${this.baseURL}/transactions/recent`);
            return {
                success: response.success || true,
                data: Array.isArray(response.data) ? response.data : [],
                message: response.message,
                errors: response.errors
            };
        } catch (error) {
            console.error('Error fetching recent transactions:', error);
            return {
                success: false,
                data: [],
                message: 'Failed to fetch recent transactions',
                errors: error instanceof Error ? { error: error.message } : { error: 'Unknown error' }
            };
        }
    }

    // Get POS statistics
    async getStats(): Promise<ApiResponse<POSStats>> {
        try {
            const response = await this.request<POSStats>(`${this.baseURL}/stats`);
            const defaultStats = {
                daily_sales: 0,
                transactions_today: 0,
                popular_items: []
            };
            
            return {
                success: response.success || true,
                data: response.data ? {
                    daily_sales: response.data.daily_sales || 0,
                    transactions_today: response.data.transactions_today || 0,
                    popular_items: Array.isArray(response.data.popular_items) ? response.data.popular_items : []
                } : defaultStats,
                message: response.message,
                errors: response.errors
            };
        } catch (error) {
            console.error('Error fetching POS stats:', error);
            return {
                success: false,
                data: {
                    daily_sales: 0,
                    transactions_today: 0,
                    popular_items: []
                },
                message: 'Failed to fetch POS statistics',
                errors: error instanceof Error ? { error: error.message } : { error: 'Unknown error' }
            };
        }
    }

    /**
     * Get cashier-specific statistics
     * DEFENSE MINUTES FIX: Per-cashier transaction tracking
     */
    async getCashierStats(): Promise<ApiResponse<CashierStats>> {
        try {
            const response = await this.request<CashierStats>(`${this.baseURL}/cashier-stats`);
            const defaultStats = {
                daily_sales: 0,
                transactions_today: 0,
                transactions_this_week: 0,
                total_transactions: 0,
                average_transaction: 0
            };
            
            return {
                success: response.success || true,
                data: response.data || defaultStats,
                message: response.message,
                errors: response.errors
            };
        } catch (error) {
            console.error('Error fetching cashier stats:', error);
            return {
                success: false,
                data: {
                    daily_sales: 0,
                    transactions_today: 0,
                    transactions_this_week: 0,
                    total_transactions: 0,
                    average_transaction: 0
                },
                message: 'Failed to fetch cashier statistics',
                errors: error instanceof Error ? { error: error.message } : { error: 'Unknown error' }
            };
        }
    }

    // Search product by barcode
    async searchByBarcode(barcode: string): Promise<ApiResponse<POSProduct | null>> {
        return this.request<POSProduct | null>(`${this.baseURL}/products?search=${barcode}`);
    }

    // Hold/save transaction for later
    async holdTransaction(transactionData: Partial<Transaction>): Promise<ApiResponse<HeldTransaction>> {
        const heldTransactions: HeldTransaction[] = JSON.parse(localStorage.getItem('heldTransactions') || '[]');
        const newTransaction: HeldTransaction = {
            id: Date.now(),
            customer_name: transactionData.customer_name,
            items: transactionData.items || [],
            subtotal: transactionData.subtotal || 0,
            discount: transactionData.discount,
            total: transactionData.total || 0,
            payment_method: transactionData.payment_method || 'cash',
            cash_amount: transactionData.cash_amount,
            held_at: new Date().toISOString()
        };
        heldTransactions.push(newTransaction);
        localStorage.setItem('heldTransactions', JSON.stringify(heldTransactions));
        
        return {
            success: true,
            data: newTransaction,
            message: 'Transaction held successfully'
        };
    }

    // Get held transactions
    async getHeldTransactions(): Promise<ApiResponse<HeldTransaction[]>> {
        const heldTransactions: HeldTransaction[] = JSON.parse(localStorage.getItem('heldTransactions') || '[]');
        return {
            success: true,
            data: heldTransactions
        };
    }

    // Resume held transaction
    async resumeHeldTransaction(transactionId: number): Promise<ApiResponse<HeldTransaction>> {
        const heldTransactions: HeldTransaction[] = JSON.parse(localStorage.getItem('heldTransactions') || '[]');
        const transaction = heldTransactions.find((t) => t.id === transactionId);
        
        if (!transaction) {
            throw new Error('Held transaction not found');
        }

        const updatedTransactions = heldTransactions.filter((t) => t.id !== transactionId);
        localStorage.setItem('heldTransactions', JSON.stringify(updatedTransactions));

        return {
            success: true,
            data: transaction,
            message: 'Transaction resumed successfully'
        };
    }

    // Print receipt
    async printReceipt(transactionData: Transaction): Promise<void> {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Unable to open print window');
        }

        const receiptHTML = this.generateReceiptHTML(transactionData);
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }

    // Generate receipt HTML with discount support
    // DEFENSE MINUTES FIX: Company name changed to "RJ & C Pharmacy"
    private generateReceiptHTML(transaction: Transaction): string {
        const discountSection = transaction.discount && transaction.discount.amount > 0 ? `
            <div class="item">
                <span>Discount (${(transaction.discount.rate * 100).toFixed(1)}%):</span>
                <span style="color: red;">-₱${transaction.discount.amount.toFixed(2)}</span>
            </div>
        ` : '';

        const customerTypeSection = (transaction.is_senior_citizen || transaction.is_pwd) ? `
            <div style="margin: 10px 0; padding: 5px; background-color: #f0f8ff; border-left: 3px solid #0066cc;">
                <p style="margin: 0; font-size: 0.9em;">
                    <strong>Discount Type:</strong> ${transaction.is_senior_citizen ? 'Senior Citizen' : 'PWD'} (20%)
                </p>
                ${transaction.senior_id ? `<p style="margin: 0; font-size: 0.9em;"><strong>ID:</strong> ${transaction.senior_id}</p>` : ''}
                ${transaction.pwd_id ? `<p style="margin: 0; font-size: 0.9em;"><strong>ID:</strong> ${transaction.pwd_id}</p>` : ''}
            </div>
        ` : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: monospace; width: 300px; margin: 0; padding: 20px; }
                    .center { text-align: center; }
                    .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .total { font-weight: bold; font-size: 1.2em; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .discount { color: red; }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2>H2-MED Enterprises</h2>
                    <p>Point of Sale System</p>
                    <p>Receipt: ${transaction.receipt_number}</p>
                    <p>${new Date(transaction.created_at || new Date()).toLocaleString()}</p>
                </div>
                
                ${transaction.customer_name ? `<p><strong>Customer:</strong> ${transaction.customer_name}</p>` : ''}
                ${customerTypeSection}
                
                <div class="line"></div>
                
                ${transaction.items.map(item => `
                    <div class="item">
                        <span>${item.name}</span>
                        <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div style="font-size: 0.8em; margin-left: 10px;">
                        ${item.quantity} x ₱${item.price.toFixed(2)}
                    </div>
                `).join('')}
                
                <div class="line"></div>
                
                <div class="item">
                    <span>Subtotal:</span>
                    <span>₱${transaction.subtotal.toFixed(2)}</span>
                </div>
                ${discountSection}
                <div class="item">
                    <span>VAT (12%):</span>
                    <span>₱${transaction.vat.toFixed(2)}</span>
                </div>
                <div class="item total">
                    <span>TOTAL:</span>
                    <span>₱${transaction.total.toFixed(2)}</span>
                </div>
                
                <div class="line"></div>
                
                <div class="item">
                    <span>Payment:</span>
                    <span>${transaction.payment_method.toUpperCase()}</span>
                </div>
                ${transaction.cash_amount ? `
                    <div class="item">
                        <span>Cash:</span>
                        <span>₱${transaction.cash_amount.toFixed(2)}</span>
                    </div>
                    <div class="item">
                        <span>Change:</span>
                        <span>₱${(transaction.change || 0).toFixed(2)}</span>
                    </div>
                ` : ''}
                
                <div class="line"></div>
                
                <div class="center">
                    <p>Thank you for your purchase!</p>
                    <p>Have a great day!</p>
                </div>
            </body>
            </html>
        `;
    }

    // Get daily sales report
    async getDailySalesReport(date?: string): Promise<ApiResponse<SalesReport>> {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.request<SalesReport>(`${this.baseURL}/reports/daily?date=${targetDate}`);
    }

    // Get sales summary
    async getSalesSummary(period: 'today' | 'week' | 'month' = 'today'): Promise<ApiResponse<SalesSummary>> {
        return this.request<SalesSummary>(`${this.baseURL}/reports/summary?period=${period}`);
    }

    // Enhanced transaction validation with discount support
    // DEFENSE MINUTES FIX: Added senior_id and pwd_id validation
    validateTransaction(
        items: ValidationItem[], 
        paymentMethod: string, 
        cashAmount?: number, 
        total?: number,
        isSeniorCitizen?: boolean,
        seniorId?: string,
        isPWD?: boolean,
        pwdId?: string
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!items || items.length === 0) {
            errors.push('Cart cannot be empty');
        }

        items.forEach((item, index) => {
            if (!item.id) {
                errors.push(`Item ${index + 1}: Missing product ID`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Invalid quantity`);
            }
            if (!item.price || item.price <= 0) {
                errors.push(`Item ${index + 1}: Invalid price`);
            }
        });

        if (!['cash', 'card', 'gcash'].includes(paymentMethod)) {
            errors.push('Invalid payment method');
        }

        if (paymentMethod === 'cash') {
            if (!cashAmount || cashAmount <= 0) {
                errors.push('Cash amount is required for cash payments');
            }
            if (total && cashAmount && cashAmount < total) {
                errors.push('Insufficient cash amount');
            }
        }

        // DEFENSE MINUTES FIX: Validate senior/PWD ID when discount is applied
        if (isSeniorCitizen && (!seniorId || seniorId.trim() === '')) {
            errors.push('Senior Citizen ID is required for senior discount');
        }

        if (isPWD && (!pwdId || pwdId.trim() === '')) {
            errors.push('PWD ID is required for PWD discount');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Calculate transaction totals with discount support
    calculateTotals(
        items: Array<{ price: number; quantity: number }>, 
        discountRate: number = 0, 
        vatRate: number = 0.12
    ): {
        subtotal: number;
        discountAmount: number;
        discountedSubtotal: number;
        vat: number;
        total: number;
    } {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = subtotal * discountRate;
        const discountedSubtotal = subtotal - discountAmount;
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            discountAmount: Math.round(discountAmount * 100) / 100,
            discountedSubtotal: Math.round(discountedSubtotal * 100) / 100,
            vat: Math.round(vat * 100) / 100,
            total: Math.round(total * 100) / 100
        };
    }

    // Calculate discount amount
    calculateDiscount(subtotal: number, discountRate: number): number {
        return Math.round((subtotal * discountRate) * 100) / 100;
    }

    // Calculate VAT on discounted amount
    calculateVAT(discountedSubtotal: number, vatRate: number = 0.12): number {
        return Math.round((discountedSubtotal * vatRate) * 100) / 100;
    }

    // Calculate change
    calculateChange(total: number, cashAmount: number): number {
        return Math.round((cashAmount - total) * 100) / 100;
    }

    // Validate discount application
    validateDiscount(discountType: 'senior' | 'pwd' | 'general', discountRate: number): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (discountType === 'senior' || discountType === 'pwd') {
            if (discountRate !== 0.20) {
                errors.push(`${discountType === 'senior' ? 'Senior citizen' : 'PWD'} discount must be 20%`);
            }
        } else if (discountType === 'general') {
            if (discountRate < 0 || discountRate > 0.5) {
                errors.push('General discount must be between 0% and 50%');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Get discount types and rates
    getDiscountTypes(): Array<{ type: string; label: string; rate: number; description: string }> {
        return [
            {
                type: 'senior',
                label: 'Senior Citizen',
                rate: 0.20,
                description: '20% discount for senior citizens (60+ years old) - ID Required'
            },
            {
                type: 'pwd',
                label: 'PWD',
                rate: 0.20,
                description: '20% discount for persons with disabilities - ID Required'
            },
            {
                type: 'general',
                label: 'General Discount',
                rate: 0,
                description: 'Customizable discount rate (0-50%)'
            }
        ];
    }

    // Format currency
    formatCurrency(amount: number): string {
        return `₱${amount.toFixed(2)}`;
    }

    // Format discount display
    formatDiscount(discountType: string, discountRate: number): string {
        const percentage = (discountRate * 100).toFixed(1);
        switch (discountType) {
            case 'senior':
                return `Senior Citizen (${percentage}%)`;
            case 'pwd':
                return `PWD (${percentage}%)`;
            case 'general':
                return `General Discount (${percentage}%)`;
            default:
                return 'No Discount';
        }
    }
}

export const posService = new POSService();