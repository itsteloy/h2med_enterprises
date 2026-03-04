// services/dashboardServices.ts

// ===== INTERFACES =====
export interface User {
    id: number;
    name: string;
    email?: string;
    role?: string;
    status?: string;
}

export interface Category {
    id: number;
    name: string;
    description?: string;
    status?: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    status?: string;
}

export interface InventoryItem {
    id: number;
    sku: string;
    name: string;
    description?: string;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    price: number;
    cost?: number;
    unit?: string;
    status?: string;
    category_id: number;
    supplier_id: number;
    created_at: string;
    updated_at?: string;
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    category?: Category;
    supplier?: Supplier;
}

export interface StockMovement {
    id: number;
    inventory_item_id: number;
    user_id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason: string;
    notes?: string;
    reference_number?: string;
    created_at: string;
    inventory_item?: {
        id: number;
        sku: string;
        name: string;
    };
    user?: User;
}

export interface Transaction {
    id: number;
    receipt_number: string;
    customer_name?: string;
    subtotal: number;
    vat: number;
    total: number;
    payment_method: 'cash' | 'card' | 'gcash';
    cash_amount?: number;
    change_amount?: number;
    status: 'completed' | 'cancelled';
    user_id: number;
    created_at: string;
    user?: User;
    items?: TransactionItem[];
}

export interface TransactionItem {
    id: number;
    transaction_id: number;
    inventory_item_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    inventory_item?: InventoryItem;
}

export interface DashboardOverview {
    inventory_summary: {
        total_items: number;
        low_stock_items: number;
        out_of_stock_items: number;
        total_value: number;
        active_items?: number;
        inactive_items?: number;
        discontinued_items?: number;
        in_stock_items?: number;
        expiring_soon_items?: number;
        expired_items?: number;
        average_item_price?: number;
    };
    recent_activities: {
        recent_stock_movements: StockMovement[];
        recently_added_items: InventoryItem[];
        recent_transactions?: Transaction[];
    };
    alerts: {
        low_stock_items: InventoryItem[];
        expiring_soon: InventoryItem[];
        out_of_stock_items?: InventoryItem[];
        expired_items?: InventoryItem[];
    };
    quick_stats: {
        categories_count: number;
        suppliers_count: number;
        users_count: number;
        movements_today: number;
        transactions_today?: number;
        sales_today?: number;
    };
}

export interface CategoryStockData {
    category: string;
    total_stock: number;
    item_count?: number;
    total_value?: number;
}

export interface SupplierValueData {
    supplier: string;
    total_value: number;
    item_count?: number;
    contact_person?: string;
}

export interface StockTrendData {
    date: string;
    stock_in: number;
    stock_out: number;
    net_change: number;
    adjustments?: number;
}

export interface SalesTrendData {
    date: string;
    sales: number;
    transactions: number;
}

export interface TopSellingItemsData {
    id: number;
    name: string;
    sku: string;
    sales_count: number;
    revenue: number;
}

export interface PaymentMethodDistributionData {
    payment_method: string;
    count: number;
    percentage: number;
}

export interface InventoryStatsData {
    total_items: number;
    active_items: number;
    inactive_items: number;
    discontinued_items: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_value: number;
    average_item_price: number;
}

export interface TransactionStatsData {
    total_transactions: number;
    total_sales: number;
    average_transaction: number;
    payment_methods: PaymentMethodDistributionData[];
}

export interface StockMovementStatsData {
    total_movements: number;
    stock_in_today: number;
    stock_out_today: number;
    adjustments_today: number;
    movements_this_week: number;
}

export interface SupplierStatsData {
    total_suppliers: number;
    active_suppliers: number;
    inactive_suppliers: number;
    low_stock_suppliers: number;
}

export interface UserStatsData {
    total_users: number;
    active_users: number;
    inactive_users: number;
    admin_users: number;
    staff_users: number;
}

export interface POSStatsData {
    daily_sales: number;
    transactions_today: number;
    popular_items: TopSellingItemsData[];
}

export interface CategoryFormData {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
}

export interface SupplierFormData {
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive';
}

export interface UserFormData {
    name: string;
    email: string;
    role: 'admin' | 'staff';
    status?: 'active' | 'inactive';
}

export interface InventoryItemFormData {
    sku: string;
    name: string;
    description?: string;
    category_id: number;
    supplier_id: number;
    price: number;
    stock_quantity: number;
    minimum_stock: number;
    unit: string;
    status: 'active' | 'inactive';
}

export interface StockAdjustmentData {
    quantity: number;
    type: 'in' | 'out' | 'adjustment';
    reason: string;
    notes?: string;
}

export interface BulkUpdateData {
    status?: string;
    price?: number;
    cost?: number;
}

export interface CategoryValidationData {
    can_delete: boolean;
    message?: string;
}

export interface DashboardCharts {
    stock_levels_by_category: CategoryStockData[];
    inventory_value_by_supplier: SupplierValueData[];
    stock_movements_trend: StockTrendData[];
    sales_trend?: SalesTrendData[];
    top_selling_items?: TopSellingItemsData[];
    payment_method_distribution?: PaymentMethodDistributionData[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, unknown>;
    pagination?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    };
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    };
}

export interface InventoryFilters {
    search?: string;
    category_id?: number;
    supplier_id?: number;
    status?: 'active' | 'inactive' | 'discontinued' | 'low_stock' | 'out_of_stock' | 'in_stock';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
}

export interface TransactionFilters {
    date_from?: string;
    date_to?: string;
    payment_method?: 'cash' | 'card' | 'gcash';
    status?: 'completed' | 'cancelled';
    search?: string;
    per_page?: number;
}

export interface StockMovementFilters {
    type?: 'in' | 'out' | 'adjustment';
    date_from?: string;
    date_to?: string;
    inventory_item_id?: number;
    user_id?: number;
    per_page?: number;
}

// ===== SERVICE CLASS =====
class DashboardService {
    private baseURL = '/api';

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
            console.error(`API Request failed for ${url}:`, error);
            throw error;
        }
    }

    // ===== DASHBOARD ENDPOINTS =====
    async getOverview(): Promise<ApiResponse<DashboardOverview>> {
        return this.request<DashboardOverview>(`${this.baseURL}/dashboard/overview`);
    }

    async getCharts(): Promise<ApiResponse<DashboardCharts>> {
        return this.request<DashboardCharts>(`${this.baseURL}/dashboard/charts`);
    }

    // ===== INVENTORY ENDPOINTS =====
    async getInventoryItems(filters: InventoryFilters = {}): Promise<ApiResponse<InventoryItem[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/inventory?${params.toString()}`;
        return this.request<InventoryItem[]>(url);
    }

    async getInventoryStats(): Promise<ApiResponse<InventoryStatsData>> {
        return this.request<InventoryStatsData>(`${this.baseURL}/inventory/stats`);
    }

    async getLowStockItems(): Promise<ApiResponse<InventoryItem[]>> {
        return this.request<InventoryItem[]>(`${this.baseURL}/inventory/low-stock`);
    }

    async checkBatchExpiration(daysAhead = 30): Promise<ApiResponse<InventoryItem[]>> {
        return this.request<InventoryItem[]>(`${this.baseURL}/inventory/batch-expiration?days_ahead=${daysAhead}`);
    }

    async generatePurchaseList(filters: Partial<InventoryFilters> = {}): Promise<ApiResponse<InventoryItem[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/inventory/purchase-list?${params.toString()}`;
        return this.request<InventoryItem[]>(url);
    }

    async adjustStock(id: number, data: StockAdjustmentData): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>(`${this.baseURL}/inventory/${id}/adjust-stock`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getStockHistory(id: number): Promise<ApiResponse<StockMovement[]>> {
        return this.request<StockMovement[]>(`${this.baseURL}/inventory/${id}/stock-history`);
    }

    async bulkUpdateInventory(itemIds: number[], updates: BulkUpdateData): Promise<ApiResponse<{ updated_count: number }>> {
        return this.request<{ updated_count: number }>(`${this.baseURL}/inventory/bulk-update`, {
            method: 'POST',
            body: JSON.stringify({
                item_ids: itemIds,
                updates
            }),
        });
    }

    async exportInventory(filters: InventoryFilters = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const response = await fetch(`${this.baseURL}/inventory/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Failed to export inventory');
        }

        return response.blob();
    }

    // ===== TRANSACTION ENDPOINTS =====
    async getTransactions(filters: TransactionFilters = {}): Promise<ApiResponse<Transaction[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/transactions?${params.toString()}`;
        return this.request<Transaction[]>(url);
    }

    async getTransactionStats(dateFrom?: string, dateTo?: string): Promise<ApiResponse<TransactionStatsData>> {
        const params = new URLSearchParams();
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        
        const url = `${this.baseURL}/transactions/stats?${params.toString()}`;
        return this.request<TransactionStatsData>(url);
    }

    async processTransaction(transactionData: Partial<Transaction>): Promise<ApiResponse<Transaction>> {
        return this.request<Transaction>(`${this.baseURL}/transactions`, {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
    }

    async voidTransaction(id: number, reason: string): Promise<ApiResponse<Transaction>> {
        return this.request<Transaction>(`${this.baseURL}/transactions/${id}/void`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    // ===== STOCK MOVEMENT ENDPOINTS =====
    async getStockMovements(filters: StockMovementFilters = {}): Promise<ApiResponse<StockMovement[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/stock-movements?${params.toString()}`;
        return this.request<StockMovement[]>(url);
    }

    async getRecentStockMovements(limit = 10): Promise<ApiResponse<StockMovement[]>> {
        return this.request<StockMovement[]>(`${this.baseURL}/stock-movements/recent?limit=${limit}`);
    }

    async getStockMovementStats(): Promise<ApiResponse<StockMovementStatsData>> {
        return this.request<StockMovementStatsData>(`${this.baseURL}/stock-movements/stats`);
    }

    // ===== CATEGORY ENDPOINTS =====
    async getCategories(filters: Partial<InventoryFilters> = {}): Promise<ApiResponse<Category[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/categories?${params.toString()}`;
        return this.request<Category[]>(url);
    }

    async getActiveCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<Category[]>(`${this.baseURL}/categories/active`);
    }

    async createCategory(data: CategoryFormData): Promise<ApiResponse<Category>> {
        return this.request<Category>(`${this.baseURL}/categories`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCategory(id: number, data: Partial<CategoryFormData>): Promise<ApiResponse<Category>> {
        return this.request<Category>(`${this.baseURL}/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCategory(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/categories/${id}`, {
            method: 'DELETE',
        });
    }

    async validateCategoryUsage(id: number): Promise<ApiResponse<CategoryValidationData>> {
        return this.request<CategoryValidationData>(`${this.baseURL}/categories/${id}/validate-usage`);
    }

    // ===== SUPPLIER ENDPOINTS =====
    async getSuppliers(filters: Partial<InventoryFilters> = {}): Promise<ApiResponse<Supplier[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/suppliers?${params.toString()}`;
        return this.request<Supplier[]>(url);
    }

    async getActiveSuppliers(): Promise<ApiResponse<Supplier[]>> {
        return this.request<Supplier[]>(`${this.baseURL}/suppliers/active`);
    }

    async getSupplierStats(): Promise<ApiResponse<SupplierStatsData>> {
        return this.request<SupplierStatsData>(`${this.baseURL}/suppliers/stats`);
    }

    async getSuppliersWithLowStock(): Promise<ApiResponse<Supplier[]>> {
        return this.request<Supplier[]>(`${this.baseURL}/suppliers/low-stock`);
    }

    async getSupplierPerformance(supplierId: number): Promise<ApiResponse<Record<string, unknown>>> {
        return this.request<Record<string, unknown>>(`${this.baseURL}/suppliers/${supplierId}/performance`);
    }

    async createSupplier(data: SupplierFormData): Promise<ApiResponse<Supplier>> {
        return this.request<Supplier>(`${this.baseURL}/suppliers`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSupplier(id: number, data: Partial<SupplierFormData>): Promise<ApiResponse<Supplier>> {
        return this.request<Supplier>(`${this.baseURL}/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteSupplier(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/suppliers/${id}`, {
            method: 'DELETE',
        });
    }

    async searchSuppliers(query: string, limit = 10): Promise<ApiResponse<Supplier[]>> {
        const params = new URLSearchParams();
        params.append('query', query);
        params.append('limit', limit.toString());
        
        return this.request<Supplier[]>(`${this.baseURL}/suppliers/search?${params.toString()}`);
    }

    async bulkUpdateSupplierStatus(supplierIds: number[], status: 'active' | 'inactive'): Promise<ApiResponse<{ updated_count: number }>> {
        return this.request<{ updated_count: number }>(`${this.baseURL}/suppliers/bulk-status`, {
            method: 'POST',
            body: JSON.stringify({
                supplier_ids: supplierIds,
                status
            }),
        });
    }

    async exportSuppliers(filters: Partial<InventoryFilters> = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const response = await fetch(`${this.baseURL}/suppliers/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Failed to export suppliers');
        }

        return response.blob();
    }

    // ===== USER ENDPOINTS =====
    async getUsers(filters: Partial<{ page?: number; per_page?: number; search?: string; role?: string; status?: string }> = {}): Promise<ApiResponse<User[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/users?${params.toString()}`;
        return this.request<User[]>(url);
    }

    async getUserStats(): Promise<ApiResponse<UserStatsData>> {
        return this.request<UserStatsData>(`${this.baseURL}/users/stats`);
    }

    async createUser(data: UserFormData): Promise<ApiResponse<User>> {
        return this.request<User>(`${this.baseURL}/users`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id: number, data: Partial<UserFormData>): Promise<ApiResponse<User>> {
        return this.request<User>(`${this.baseURL}/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/users/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== POS ENDPOINTS =====
    async getPOSProducts(filters: Partial<InventoryFilters> = {}): Promise<ApiResponse<InventoryItem[]>> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const url = `${this.baseURL}/pos/products?${params.toString()}`;
        return this.request<InventoryItem[]>(url);
    }

    async getPOSStats(): Promise<ApiResponse<POSStatsData>> {
        return this.request<POSStatsData>(`${this.baseURL}/pos/stats`);
    }

    async getRecentPOSTransactions(limit = 10): Promise<ApiResponse<Transaction[]>> {
        return this.request<Transaction[]>(`${this.baseURL}/pos/transactions/recent?limit=${limit}`);
    }

    // ===== INVENTORY ITEM CRUD =====
    async createInventoryItem(data: InventoryItemFormData): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>(`${this.baseURL}/inventory`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getInventoryItem(id: number): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>(`${this.baseURL}/inventory/${id}`);
    }

    async updateInventoryItem(id: number, data: Partial<InventoryItemFormData>): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>(`${this.baseURL}/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteInventoryItem(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/inventory/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== UTILITY METHODS =====
    async refreshDashboard(): Promise<ApiResponse<DashboardOverview>> {
        return this.getOverview();
    }

    async searchItems(query: string, limit = 10): Promise<ApiResponse<InventoryItem[]>> {
        return this.getInventoryItems({ search: query, per_page: limit });
    }

    // ===== REAL-TIME METHODS =====
    startRealTimeUpdates(callback: (data: DashboardOverview) => void, interval = 30000): () => void {
        const intervalId = setInterval(async () => {
            try {
                const overview = await this.getOverview();
                callback(overview.data);
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }, interval);

        return () => clearInterval(intervalId);
    }
}

export const dashboardService = new DashboardService();