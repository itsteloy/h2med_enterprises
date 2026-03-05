// services/inventoryServices.ts

// ===== INTERFACES =====
export interface Category {
    id: number;
    name: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: number;
    sku: string;
    name: string;
    description?: string;
    category_id: number;
    supplier_id: number;
    price: number;
    cost?: number;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    unit: string;
    status: 'active' | 'inactive' | 'discontinued';
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    images?: string[];
    created_at: string;
    updated_at: string;
    category?: Category;
    supplier?: Supplier;
    terms?: string;
    paid_status?: 'unpaid' | 'partial' | 'paid';
}

// NEW: Batch Expiration Interfaces
export interface ExpiringItem {
    id: number;
    name: string;
    sku: string;
    batch_number?: string;
    expiry_date: string;
    days_until_expiry: number;
    stock_quantity: number;
    category: string;
    supplier: string;
    price: number;
    minimum_stock: number;
}

export interface ExpirationSummary {
    total_expiring_items: number;
    total_expiring_stock: number;
    check_date_range: string;
    expired_items?: number;
    critical_items?: number;
    warning_items?: number;
    notice_items?: number;
}

export interface BatchExpirationResponse extends ApiResponse<ExpiringItem[]> {
    summary?: ExpirationSummary;
}

export interface InventoryStats {
    total_items: number;
    active_items: number;
    inactive_items: number;
    discontinued_items: number;
    low_stock_items: number;
    out_of_stock_items: number;
    in_stock_items: number;
    total_categories: number;
    total_suppliers: number;
    total_inventory_value: number;
    average_item_price: number;
    expiring_soon_items: number;
    expired_items: number;
    items_with_barcodes: number;
    items_without_barcodes: number;
}

export interface InventoryFormData {
    sku: string;
    name: string;
    description?: string;
    category_id: number;
    supplier_id: number;
    price: number;
    cost?: number;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    unit: string;
    status: 'active' | 'inactive' | 'discontinued';
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    images?: string[];
    auto_generate_barcode?: boolean;
    barcode_prefix?: string;
    initial_reference?: string;
    terms?: string;
    paid_status?: 'unpaid' | 'partial' | 'paid';
}

export interface StockAdjustmentData {
    quantity: number;
    type: 'in' | 'out' | 'adjustment';
    reason: string;
    notes?: string;
    reference_number: string; // Now required
}

export interface ReferenceNumberData {
    recent_references: string[];
    suggestions: string[];
    format_examples: string[];
}

export interface BarcodeGenerationData {
    prefix?: string;
    item_ids?: number[];
}

export interface DeletionCheckData {
    item_name: string;
    can_delete: boolean;
    requires_confirmation: boolean;
    warnings: Array<{
        type: string;
        count?: number;
        quantity?: number;
        message: string;
    }>;
}

export interface ValidationError {
    type: 'validation_error' | 'system_error';
    message: string;
    severity: 'high' | 'medium' | 'low';
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, string | string[]>;
    detailed_errors?: ValidationError[];
    barcode_generated?: boolean;
    duplicate_reference?: {
        reference: string;
        existing_date: string;
        existing_user: string;
    };
    warnings?: Array<{
        type: string;
        count?: number;
        quantity?: number;
        message: string;
    }>;
    requires_confirmation?: boolean;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export interface InventoryResponse extends ApiResponse<InventoryItem[]> {
    pagination: PaginationData;
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
    updated_at: string;
    user?: {
        id: number;
        name: string;
    };
    inventory_item?: {
        id: number;
        name: string;
        sku: string;
    };
}

export type StockHistoryResponse = ApiResponse<{
    item: InventoryItem;
    movements: StockMovement[];
    pagination: PaginationData;
}>;

export interface ProductTransaction {
    id: number;
    type: 'sale' | 'restock' | 'adjustment' | 'return';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason?: string;
    reference_number?: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
    sale?: {
        id: number;
        receipt_number: string;
        customer_name?: string;
    };
}

export interface ProductSalesHistory {
    period: string;
    sales_quantity: number;
    sales_amount: number;
    average_price: number;
}

// ===== SERVICE CLASS =====
class InventoryService {
    private baseURL = '/api/inventory';

    private async request<T>(method: string, url: string, data?: unknown): Promise<ApiResponse<T>> {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken || '',
            'X-Requested-With': 'XMLHttpRequest',
        };

        const config: RequestInit = {
            method,
            headers,
            credentials: 'same-origin',
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const responseData = await response.json();

            if (!response.ok) {
                const error = new Error(responseData.message || `Request failed with status ${response.status}`) as Error & { response?: unknown };
                error.response = responseData;
                throw error;
            }

            return responseData;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getItems(params: {
        page?: number;
        per_page?: number;
        search?: string;
        category_id?: number;
        supplier_id?: number;
        status?: string;
        sort_by?: string;
        sort_order?: string;
    } = {}): Promise<InventoryResponse> {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${query.toString()}`;
        return this.request<InventoryItem[]>('GET', url) as Promise<InventoryResponse>;
    }

    async getItem(id: number): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>('GET', `${this.baseURL}/${id}`);
    }

    async createItem(itemData: InventoryFormData): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>('POST', this.baseURL, itemData);
    }

    async updateItem(id: number, itemData: Partial<InventoryFormData>): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>('PUT', `${this.baseURL}/${id}`, itemData);
    }

    async checkDeletion(id: number): Promise<ApiResponse<DeletionCheckData>> {
        return this.request<DeletionCheckData>('GET', `${this.baseURL}/${id}/check-deletion`);
    }

    async deleteItem(id: number, forceDelete = false): Promise<ApiResponse<null>> {
        return this.request<null>('DELETE', `${this.baseURL}/${id}`, { force_delete: forceDelete });
    }

    async getStats(): Promise<ApiResponse<InventoryStats>> {
        return this.request<InventoryStats>('GET', `${this.baseURL}/stats`);
    }

    async getLowStockItems(): Promise<ApiResponse<InventoryItem[]>> {
        return this.request<InventoryItem[]>('GET', `${this.baseURL}/low-stock`);
    }

    // === BARCODE GENERATION METHODS ===
    async generateBarcode(id: number, prefix?: string): Promise<ApiResponse<{ barcode: string; item_id: number; item_name: string }>> {
        return this.request('POST', `${this.baseURL}/${id}/generate-barcode`, { prefix });
    }

    async bulkGenerateBarcodes(data: BarcodeGenerationData): Promise<ApiResponse<{ generated_count: number; prefix_used: string }>> {
        return this.request('POST', `${this.baseURL}/bulk-generate-barcodes`, data);
    }

    // === REFERENCE NUMBER MANAGEMENT ===
    async getAvailableReferenceNumbers(itemId?: number): Promise<ApiResponse<ReferenceNumberData>> {
        const params = itemId ? `?item_id=${itemId}` : '';
        return this.request<ReferenceNumberData>('GET', `${this.baseURL}/reference-numbers${params}`);
    }

    async adjustStock(id: number, adjustmentData: StockAdjustmentData): Promise<ApiResponse<InventoryItem>> {
        return this.request<InventoryItem>('POST', `${this.baseURL}/${id}/adjust-stock`, adjustmentData);
    }

    async getStockHistory(id: number, page = 1): Promise<StockHistoryResponse> {
        return this.request('GET', `${this.baseURL}/${id}/stock-history?page=${page}`) as Promise<StockHistoryResponse>;
    }

    async getProductTransactions(id: number): Promise<ApiResponse<ProductTransaction[]>> {
        return this.request<ProductTransaction[]>('GET', `${this.baseURL}/${id}/transactions`);
    }

    async getSalesHistory(id: number): Promise<ApiResponse<ProductSalesHistory[]>> {
        return this.request<ProductSalesHistory[]>('GET', `${this.baseURL}/${id}/sales-history`);
    }

    async bulkUpdate(itemIds: number[], updates: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
        return this.request<Record<string, unknown>>('POST', `${this.baseURL}/bulk-update`, { item_ids: itemIds, updates });
    }

    async exportItems(filters: Record<string, unknown> = {}): Promise<Blob> {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/export?${query.toString()}`;
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }

    // === BATCH EXPIRATION METHODS ===
    async getBatchExpiration(daysAhead: number = 30): Promise<BatchExpirationResponse> {
        const url = `${this.baseURL}/batch-expiration?days_ahead=${daysAhead}`;
        return this.request<ExpiringItem[]>('GET', url) as Promise<BatchExpirationResponse>;
    }

    async exportBatchExpiration(daysAhead: number = 30): Promise<Blob> {
        const url = `${this.baseURL}/batch-expiration/export?days_ahead=${daysAhead}`;
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Batch expiration export failed');
        }

        return response.blob();
    }

    // === UTILITY METHODS ===
    generateReferenceNumber(type: 'ADJ' | 'INV' | 'RESTOCK' | 'SALES' | 'RETURN' | 'IN' | 'OUT' = 'ADJ'): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 999) + 1;
        return `${type}-${date}-${random.toString().padStart(3, '0')}`;
    }

    validateBarcode(barcode: string): { isValid: boolean; message?: string } {
        if (!barcode || barcode.trim().length === 0) {
            return { isValid: false, message: 'Barcode cannot be empty' };
        }

        if (barcode.length < 6) {
            return { isValid: false, message: 'Barcode must be at least 6 characters long' };
        }

        if (barcode.length > 100) {
            return { isValid: false, message: 'Barcode cannot exceed 100 characters' };
        }

        // Check for valid characters (alphanumeric, hyphens, underscores)
        const validPattern = /^[A-Za-z0-9\-_]+$/;
        if (!validPattern.test(barcode)) {
            return { isValid: false, message: 'Barcode can only contain letters, numbers, hyphens, and underscores' };
        }

        return { isValid: true };
    }

    validateReferenceNumber(reference: string): { isValid: boolean; message?: string } {
        if (!reference || reference.trim().length === 0) {
            return { isValid: false, message: 'Reference number is required' };
        }

        if (reference.length < 3) {
            return { isValid: false, message: 'Reference number must be at least 3 characters long' };
        }

        if (reference.length > 100) {
            return { isValid: false, message: 'Reference number cannot exceed 100 characters' };
        }

        return { isValid: true };
    }

    formatValidationErrors(errors: Record<string, unknown>): string[] {
        if (typeof errors === 'string') {
            return [errors];
        }

        if (Array.isArray(errors)) {
            return errors.map(error => 
                typeof error === 'string' ? error : error.message || 'Unknown error'
            );
        }

        if (typeof errors === 'object' && errors !== null) {
            const errorMessages: string[] = [];
            Object.values(errors).forEach((value: unknown) => {
                if (Array.isArray(value)) {
                    errorMessages.push(...value);
                } else if (typeof value === 'string') {
                    errorMessages.push(value);
                }
            });
            return errorMessages;
        }

        return ['An unknown error occurred'];
    }

    // === SEARCH AND FILTER HELPERS ===
    async searchByBarcode(barcode: string): Promise<ApiResponse<InventoryItem[]>> {
        return this.getItems({ search: barcode, per_page: 10 });
    }

    async getItemsWithoutBarcodes(): Promise<ApiResponse<InventoryItem[]>> {
        // This would need a specific endpoint or filtering capability
        return this.getItems({ per_page: 100 }); // Placeholder - would need backend support
    }
}

export const inventoryService = new InventoryService();