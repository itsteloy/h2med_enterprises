// services/stockMovementServices.ts

// ===== INTERFACES =====
export interface User {
    id: number;
    name: string;
}

export interface InventoryItem {
    id: number;
    sku: string;
    name: string;
    stock_quantity: number;
    batch_number?: string;
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
    inventory_item?: InventoryItem;
    user?: User;
}

export interface StockMovementStats {
    total_movements: number;
    stock_in_today: number;
    stock_out_today: number;
    adjustments_today: number;
    movements_this_week: number;
    movements_this_month: number;
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
    from?: number;
    to?: number;
}

export interface StockMovementResponse extends ApiResponse<StockMovement[]> {
    pagination: PaginationData;
}

// ===== SERVICE CLASS =====
class StockMovementService {
    private baseURL = '/api/stock-movements';

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

    async getMovements(params: {
        page?: number;
        per_page?: number;
        type?: string;
        inventory_item_id?: number;
        user_id?: number;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<StockMovementResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<StockMovement[]>(url) as Promise<StockMovementResponse>;
    }

    async getRecentMovements(limit = 10): Promise<ApiResponse<StockMovement[]>> {
        return this.request<StockMovement[]>(`${this.baseURL}/recent?limit=${limit}`);
    }

    async getMovementStats(): Promise<ApiResponse<StockMovementStats>> {
        return this.request<StockMovementStats>(`${this.baseURL}/stats`);
    }

    async getMovementsByItem(itemId: number, params: {
        page?: number;
        per_page?: number;
        type?: string;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<StockMovementResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('inventory_item_id', itemId.toString());
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<StockMovement[]>(url) as Promise<StockMovementResponse>;
    }

    async getMovementsByUser(userId: number, params: {
        page?: number;
        per_page?: number;
        type?: string;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<StockMovementResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('user_id', userId.toString());
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<StockMovement[]>(url) as Promise<StockMovementResponse>;
    }

    async getMovementsByType(type: 'in' | 'out' | 'adjustment', params: {
        page?: number;
        per_page?: number;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<StockMovementResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('type', type);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<StockMovement[]>(url) as Promise<StockMovementResponse>;
    }

    async getMovementsByDateRange(dateFrom: string, dateTo: string, params: {
        page?: number;
        per_page?: number;
        type?: string;
        inventory_item_id?: number;
        user_id?: number;
    } = {}): Promise<StockMovementResponse> {
        const searchParams = new URLSearchParams();
        searchParams.append('date_from', dateFrom);
        searchParams.append('date_to', dateTo);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<StockMovement[]>(url) as Promise<StockMovementResponse>;
    }

    async getTodayMovements(): Promise<ApiResponse<StockMovement[]>> {
        const today = new Date().toISOString().split('T')[0];
        return this.getMovementsByDateRange(today, today, { per_page: 100 });
    }

    async getThisWeekMovements(): Promise<ApiResponse<StockMovement[]>> {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        
        return this.getMovementsByDateRange(
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0],
            { per_page: 100 }
        );
    }

    async getThisMonthMovements(): Promise<ApiResponse<StockMovement[]>> {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return this.getMovementsByDateRange(
            monthStart.toISOString().split('T')[0],
            monthEnd.toISOString().split('T')[0],
            { per_page: 100 }
        );
    }
}

export const stockMovementService = new StockMovementService();