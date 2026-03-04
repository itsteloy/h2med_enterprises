// services/categoryServices.ts

// ===== INTERFACES =====
export interface Category {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
    inventory_items_count?: number;
}

export interface CategoryFormData {
    name: string;
    description?: string;
    status: 'active' | 'inactive';
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, unknown>;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
}

export interface CategoryResponse extends ApiResponse<Category[]> {
    pagination: PaginationData;
}

export interface CategoryStats {
    total_categories: number;
    active_categories: number;
    inactive_categories: number;
    categories_with_items: number;
    categories_without_items: number;
    top_categories: Array<{
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

export interface CategoryFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface CategoryValidation {
    can_delete: boolean;
    message?: string;
    items_count?: number;
    items?: Array<{
        id: number;
        sku: string;
        name: string;
        stock_quantity: number;
    }>;
}

export interface BulkOperationResult {
    success: boolean;
    affected_count: number;
    message: string;
}

export interface ImportResult {
    imported_count: number;
    skipped_count: number;
    failed_count: number;
    errors?: Array<{ row: number; message: string }>;
}

export interface MoveItemsResult {
    moved_count: number;
    from_category_id: number;
    to_category_id: number;
}

export interface CategoryHierarchyItem extends Category {
    children?: CategoryHierarchyItem[];
}

export interface CategoryPerformanceData {
    category_id: number;
    period: string;
    total_sales: number;
    total_items_sold: number;
    average_rating?: number;
    growth_percentage?: number;
}

export interface CategoryTrendData {
    date: string;
    category_id: number;
    sales: number;
    items_sold: number;
}

export interface CacheEntry {
    data: unknown;
    timestamp: number;
}

export interface InventoryItem {
    id: number;
    name: string;
    sku: string;
    price?: number;
    stock_quantity?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, unknown>;
    pagination?: PaginationData;
}

// ===== SERVICE CLASS =====
class CategoryService {
    private baseURL = '/api/categories';

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

    // ===== CATEGORY CRUD OPERATIONS =====
    async getCategories(params: CategoryFilters = {}): Promise<CategoryResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}?${searchParams.toString()}`;
        return this.request<Category[]>(url) as Promise<CategoryResponse>;
    }

    async getCategory(id: number): Promise<ApiResponse<Category>> {
        return this.request<Category>(`${this.baseURL}/${id}`);
    }

    async createCategory(categoryData: CategoryFormData): Promise<ApiResponse<Category>> {
        // Validate data before sending
        this.validateCategoryData(categoryData);
        
        return this.request<Category>(this.baseURL, {
            method: 'POST',
            body: JSON.stringify(categoryData),
        });
    }

    async updateCategory(id: number, categoryData: Partial<CategoryFormData>): Promise<ApiResponse<Category>> {
        // Validate data before sending
        if (categoryData.name || categoryData.status) {
            this.validateCategoryData(categoryData as CategoryFormData);
        }
        
        return this.request<Category>(`${this.baseURL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData),
        });
    }

    async deleteCategory(id: number): Promise<ApiResponse<null>> {
        // First validate if category can be deleted
        const validation = await this.validateCategoryUsage(id);
        if (!validation.can_delete) {
            throw new Error(validation.message || 'Category cannot be deleted');
        }
        
        return this.request<null>(`${this.baseURL}/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== CATEGORY VALIDATION =====
    private validateCategoryData(data: Partial<CategoryFormData>): void {
        if (data.name && data.name.trim().length < 2) {
            throw new Error('Category name must be at least 2 characters long');
        }
        
        if (data.name && data.name.trim().length > 255) {
            throw new Error('Category name cannot exceed 255 characters');
        }
        
        if (data.description && data.description.length > 500) {
            throw new Error('Description cannot exceed 500 characters');
        }
        
        if (data.status && !['active', 'inactive'].includes(data.status)) {
            throw new Error('Invalid status. Must be either active or inactive');
        }
    }

    async validateCategoryUsage(id: number): Promise<CategoryValidation> {
        try {
            const response = await this.request<CategoryValidation>(`${this.baseURL}/${id}/validate-usage`);
            return response.data;
        } catch {
            // If validation endpoint doesn't exist, allow deletion
            return { can_delete: true };
        }
    }

    // ===== SPECIALIZED CATEGORY OPERATIONS =====
    async getActiveCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<Category[]>(`${this.baseURL}/active`);
    }

    async getCategoryStats(): Promise<ApiResponse<CategoryStats>> {
        return this.request<CategoryStats>(`${this.baseURL}/stats`);
    }

    async searchCategories(query: string, limit = 10): Promise<ApiResponse<Category[]>> {
        const params = new URLSearchParams();
        params.append('search', query);
        params.append('per_page', limit.toString());
        
        return this.getCategories({ search: query, per_page: limit });
    }

    // ===== BULK OPERATIONS =====
    async bulkUpdateStatus(categoryIds: number[], status: 'active' | 'inactive'): Promise<ApiResponse<BulkOperationResult>> {
        return this.request<BulkOperationResult>(`${this.baseURL}/bulk-status`, {
            method: 'POST',
            body: JSON.stringify({
                category_ids: categoryIds,
                status
            }),
        });
    }

    async bulkDelete(categoryIds: number[]): Promise<ApiResponse<BulkOperationResult>> {
        // Validate each category before bulk deletion
        for (const id of categoryIds) {
            const validation = await this.validateCategoryUsage(id);
            if (!validation.can_delete) {
                throw new Error(`Cannot delete some categories: ${validation.message}`);
            }
        }
        
        return this.request<BulkOperationResult>(`${this.baseURL}/bulk-delete`, {
            method: 'POST',
            body: JSON.stringify({
                category_ids: categoryIds
            }),
        });
    }

    // ===== EXPORT/IMPORT OPERATIONS =====
    async exportCategories(filters: CategoryFilters = {}): Promise<Blob> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });
        
        const response = await fetch(`${this.baseURL}/export?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Failed to export categories');
        }

        return response.blob();
    }

    async importCategories(file: File): Promise<ApiResponse<ImportResult>> {
        const formData = new FormData();
        formData.append('file', file);
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const response = await fetch(`${this.baseURL}/import`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: formData,
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to import categories');
        }

        return data;
    }

    // ===== CATEGORY RELATIONSHIPS =====
    async getCategoryWithItems(id: number, includeItems = false): Promise<ApiResponse<Category & { items?: InventoryItem[] }>> {
        const params = includeItems ? '?include_items=true' : '';
        return this.request<Category & { items?: InventoryItem[] }>(`${this.baseURL}/${id}${params}`);
    }

    async moveItemsToCategory(fromCategoryId: number, toCategoryId: number, itemIds?: number[]): Promise<ApiResponse<MoveItemsResult>> {
        return this.request<MoveItemsResult>(`${this.baseURL}/${fromCategoryId}/move-items`, {
            method: 'POST',
            body: JSON.stringify({
                to_category_id: toCategoryId,
                item_ids: itemIds // If not provided, moves all items
            }),
        });
    }

    // ===== UTILITY METHODS =====
    async duplicateCategory(id: number, newName?: string): Promise<ApiResponse<Category>> {
        return this.request<Category>(`${this.baseURL}/${id}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({
                name: newName
            }),
        });
    }

    async getCategoriesForDropdown(): Promise<ApiResponse<Array<{ id: number; name: string; status: string }>>> {
        return this.request<Array<{ id: number; name: string; status: string }>>(`${this.baseURL}/dropdown`);
    }

    async getCategoryHierarchy(): Promise<ApiResponse<CategoryHierarchyItem[]>> {
        // For future use if categories have parent-child relationships
        return this.request<CategoryHierarchyItem[]>(`${this.baseURL}/hierarchy`);
    }

    // ===== ANALYTICS METHODS =====
    async getCategoryPerformance(id: number, period = 'month'): Promise<ApiResponse<CategoryPerformanceData>> {
        const params = new URLSearchParams();
        params.append('period', period);
        
        return this.request<CategoryPerformanceData>(`${this.baseURL}/${id}/performance?${params.toString()}`);
    }

    async getTopPerformingCategories(limit = 10, period = 'month'): Promise<ApiResponse<CategoryPerformanceData[]>> {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('period', period);
        
        return this.request<CategoryPerformanceData[]>(`${this.baseURL}/top-performing?${params.toString()}`);
    }

    async getCategoryTrends(period = 'month'): Promise<ApiResponse<CategoryTrendData[]>> {
        const params = new URLSearchParams();
        params.append('period', period);
        
        return this.request<CategoryTrendData[]>(`${this.baseURL}/trends?${params.toString()}`);
    }

    // ===== CACHE MANAGEMENT =====
    private categoryCache = new Map<string, CacheEntry>();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    private getCacheKey(endpoint: string, params?: Record<string, unknown>): string {
        return `${endpoint}_${JSON.stringify(params || {})}`;
    }

    private getFromCache<T>(key: string): T | null {
        const cached = this.categoryCache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data as T;
        }
        this.categoryCache.delete(key);
        return null;
    }

    private setCache(key: string, data: unknown): void {
        this.categoryCache.set(key, { data, timestamp: Date.now() });
    }

    async getCategoriesWithCache(params: CategoryFilters = {}): Promise<CategoryResponse> {
        const cacheKey = this.getCacheKey('categories', params as Record<string, unknown>);
        const cached = this.getFromCache<CategoryResponse>(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        const result = await this.getCategories(params);
        this.setCache(cacheKey, result);
        return result;
    }

    clearCache(): void {
        this.categoryCache.clear();
    }

    // ===== ERROR HANDLING UTILITIES =====
    handleApiError(error: unknown): never {
        if (error instanceof Error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            }
            
            if (error.message.includes('422')) {
                throw new Error('Validation error. Please check your input data.');
            }
            
            if (error.message.includes('403')) {
                throw new Error('You do not have permission to perform this action.');
            }
            
            if (error.message.includes('404')) {
                throw new Error('Category not found.');
            }
            
            if (error.message.includes('500')) {
                throw new Error('Server error. Please try again later.');
            }
        }
        
        throw error;
    }

    // ===== REAL-TIME UPDATES =====
    startRealTimeUpdates(callback: (categories: Category[]) => void, interval = 30000): () => void {
        const intervalId = setInterval(async () => {
            try {
                const response = await this.getCategories({ per_page: 100 });
                callback(response.data);
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }, interval);

        return () => clearInterval(intervalId);
    }
}

export const categoryService = new CategoryService();