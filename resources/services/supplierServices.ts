// services/supplierServices.ts

// ===== INTERFACES =====
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
    inventory_items_count?: number;
}

export interface SupplierFormData {
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive';
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

export interface SupplierResponse extends ApiResponse<Supplier[]> {
    pagination: PaginationData;
}

export interface SupplierStats {
    total_suppliers: number;
    active_suppliers: number;
    inactive_suppliers: number;
    suppliers_with_items: number;
    suppliers_without_items: number;
    top_suppliers: Array<{
        id: number;
        name: string;
        inventory_items_count: number;
    }>;
    recently_added: Array<{
        id: number;
        name: string;
        created_at: string;
        status: string;
    }>;
}

export interface SupplierPerformance {
    id: number;
    name: string;
    total_orders: number;
    on_time_delivery_rate: number;
    average_delivery_days: number;
    quality_score: number;
    last_delivery_date?: string;
}

export interface BulkStatusResult {
    updated_count: number;
    failed_count: number;
    message: string;
}

export interface ExportParams {
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    per_page?: number;
}

// ===== SERVICE CLASS =====
class SupplierService {
    private baseURL = '/api/suppliers';

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

    async getSuppliers(params: {
        page?: number;
        per_page?: number;
        search?: string;
        status?: string;
        sort_by?: string;
        sort_order?: string;
    } = {}): Promise<SupplierResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<Supplier[]>(url) as Promise<SupplierResponse>;
    }

    async getSupplier(id: number): Promise<ApiResponse<Supplier>> {
        return this.request<Supplier>(`${this.baseURL}/${id}`);
    }

    async createSupplier(supplierData: SupplierFormData): Promise<ApiResponse<Supplier>> {
        return this.request<Supplier>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(supplierData),
        });
    }

    async updateSupplier(id: number, supplierData: Partial<SupplierFormData>): Promise<ApiResponse<Supplier>> {
        return this.request<Supplier>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(supplierData),
        });
    }

    async deleteSupplier(id: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    async getActiveSuppliers(): Promise<ApiResponse<Supplier[]>> {
        return this.request<Supplier[]>(`${this.baseURL}/active`);
    }

    async getSupplierStats(): Promise<ApiResponse<SupplierStats>> {
        return this.request<SupplierStats>(`${this.baseURL}/stats`);
    }

    async getSuppliersWithLowStock(): Promise<ApiResponse<Supplier[]>> {
        return this.request<Supplier[]>(`${this.baseURL}/low-stock`);
    }

    async searchSuppliers(query: string, limit = 10): Promise<ApiResponse<Supplier[]>> {
        const searchParams = new URLSearchParams({ query, limit: limit.toString() });
        return this.request<Supplier[]>(`${this.baseURL}/search?${searchParams.toString()}`);
    }

    async getSupplierPerformance(id: number): Promise<ApiResponse<SupplierPerformance>> {
        return this.request<SupplierPerformance>(`${this.baseURL}/${id}/performance`);
    }

    async bulkUpdateStatus(supplierIds: number[], status: 'active' | 'inactive'): Promise<ApiResponse<BulkStatusResult>> {
        return this.request<BulkStatusResult>(`${this.baseURL}/bulk-status`, {
            method: 'POST',
            body: JSON.stringify({ supplier_ids: supplierIds, status }),
        });
    }

    async exportSuppliers(params: ExportParams = {}): Promise<void> {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/export?${searchParams.toString()}`;
        window.open(url, '_blank');
    }
}

export const supplierService = new SupplierService();