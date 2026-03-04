// services/productDetailsServices.ts

// ===== INTERFACES =====
export interface ProductDetails {
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
    weight?: string;
    dimensions?: string;
    location?: string;
    created_at: string;
    updated_at: string;
    category?: {
        id: number;
        name: string;
    };
    supplier?: {
        id: number;
        name: string;
        contact_person?: string;
        phone?: string;
        email?: string;
    };
}

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

export interface ProductStats {
    total_sales_quantity: number;
    total_sales_amount: number;
    average_monthly_sales: number;
    current_stock_value: number;
    profit_margin: number;
    turnover_rate: number;
    days_of_stock: number;
    reorder_point: number;
}

export interface LowStockAlert {
    id: number;
    inventory_item_id: number;
    current_stock: number;
    minimum_stock: number;
    status: 'active' | 'resolved';
    created_at: string;
}

export interface ExpiryAlert {
    id: number;
    inventory_item_id: number;
    expiry_date: string;
    days_until_expiry: number;
    status: 'active' | 'resolved';
    created_at: string;
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
}

export interface ProductTransactionResponse extends ApiResponse<ProductTransaction[]> {
    pagination: PaginationData;
}

// ===== SERVICE CLASS =====
class ProductDetailsService {
    private baseURL = '/api/products';

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

    // Get product details by ID
    async getProductDetails(productId: number): Promise<ApiResponse<ProductDetails>> {
        return this.request<ProductDetails>(`${this.baseURL}/${productId}/details`);
    }

    // Get product transactions/history
    async getProductTransactions(productId: number, params: {
        page?: number;
        per_page?: number;
        type?: string;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<ProductTransactionResponse> {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value.toString());
            }
        });

        const url = `${this.baseURL}/${productId}/transactions?${searchParams.toString()}`;
        return this.request<ProductTransaction[]>(url) as Promise<ProductTransactionResponse>;
    }

    // Get product sales history
    async getProductSalesHistory(productId: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly', limit = 12): Promise<ApiResponse<ProductSalesHistory[]>> {
        return this.request<ProductSalesHistory[]>(`${this.baseURL}/${productId}/sales-history?period=${period}&limit=${limit}`);
    }

    // Get product statistics
    async getProductStats(productId: number): Promise<ApiResponse<ProductStats>> {
        return this.request<ProductStats>(`${this.baseURL}/${productId}/stats`);
    }

    // Update product stock
    async updateProductStock(productId: number, adjustment: {
        quantity: number;
        type: 'in' | 'out' | 'adjustment';
        reason: string;
        notes?: string;
        reference_number?: string;
    }): Promise<ApiResponse<ProductDetails>> {
        return this.request<ProductDetails>(`${this.baseURL}/${productId}/stock`, {
            method: 'POST',
            body: JSON.stringify(adjustment),
        });
    }

    // Update product details
    async updateProductDetails(productId: number, productData: Partial<ProductDetails>): Promise<ApiResponse<ProductDetails>> {
        return this.request<ProductDetails>(`${this.baseURL}/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    }

    // Delete product
    async deleteProduct(productId: number): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/${productId}`, {
            method: 'DELETE',
        });
    }

    // Get low stock alerts for product
    async getLowStockAlerts(productId: number): Promise<ApiResponse<LowStockAlert[]>> {
        return this.request<LowStockAlert[]>(`${this.baseURL}/${productId}/low-stock-alerts`);
    }

    // Get expiry alerts for product
    async getExpiryAlerts(productId: number): Promise<ApiResponse<ExpiryAlert[]>> {
        return this.request<ExpiryAlert[]>(`${this.baseURL}/${productId}/expiry-alerts`);
    }

    // Mark alert as resolved
    async resolveAlert(alertId: number, type: 'low-stock' | 'expiry'): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/alerts/${type}/${alertId}/resolve`, {
            method: 'POST',
        });
    }

    // Generate product QR code
    async generateQRCode(productId: number): Promise<ApiResponse<{ qr_code: string }>> {
        return this.request<{ qr_code: string }>(`${this.baseURL}/${productId}/qr-code`, {
            method: 'POST',
        });
    }

    // Generate product barcode
    async generateBarcode(productId: number): Promise<ApiResponse<{ barcode: string }>> {
        return this.request<{ barcode: string }>(`${this.baseURL}/${productId}/barcode`, {
            method: 'POST',
        });
    }

    // Get product performance metrics
    async getProductPerformance(productId: number, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ApiResponse<{
        sales_trend: Array<{ date: string; quantity: number; amount: number }>;
        comparison_data: {
            current_period: { quantity: number; amount: number };
            previous_period: { quantity: number; amount: number };
            growth_rate: number;
        };
        top_selling_days: Array<{ day: string; quantity: number }>;
        seasonal_trends: Array<{ month: string; average_sales: number }>;
    }>> {
        return this.request<{
            sales_trend: Array<{ date: string; quantity: number; amount: number }>;
            comparison_data: {
                current_period: { quantity: number; amount: number };
                previous_period: { quantity: number; amount: number };
                growth_rate: number;
            };
            top_selling_days: Array<{ day: string; quantity: number }>;
            seasonal_trends: Array<{ month: string; average_sales: number }>;
        }>(`${this.baseURL}/${productId}/performance?period=${period}`);
    }

    // Get similar products (based on category/supplier)
    async getSimilarProducts(productId: number, limit = 5): Promise<ApiResponse<ProductDetails[]>> {
        return this.request<ProductDetails[]>(`${this.baseURL}/${productId}/similar?limit=${limit}`);
    }

    // Get product reviews/ratings (if applicable)
    async getProductReviews(productId: number, params: {
        page?: number;
        per_page?: number;
    } = {}): Promise<ApiResponse<Array<Record<string, unknown>>>> {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.per_page) searchParams.append('per_page', params.per_page.toString());

        const url = `${this.baseURL}/${productId}/reviews?${searchParams.toString()}`;
        return this.request<Array<Record<string, unknown>>>(url);
    }

    // Export product data
    async exportProductData(productId: number, format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
        const url = `${this.baseURL}/${productId}/export?format=${format}`;
        window.open(url, '_blank');
    }

    // Get product forecast
    async getProductForecast(productId: number, months = 6): Promise<ApiResponse<{
        forecast_data: Array<{ month: string; predicted_sales: number; confidence_level: number }>;
        recommended_stock: number;
        optimal_reorder_point: number;
        seasonal_factors: Array<{ month: string; factor: number }>;
    }>> {
        return this.request<{
            forecast_data: Array<{ month: string; predicted_sales: number; confidence_level: number }>;
            recommended_stock: number;
            optimal_reorder_point: number;
            seasonal_factors: Array<{ month: string; factor: number }>;
        }>(`${this.baseURL}/${productId}/forecast?months=${months}`);
    }

    // Update product images
    async updateProductImages(productId: number, images: FileList): Promise<ApiResponse<{ images: string[] }>> {
        const formData = new FormData();
        Array.from(images).forEach((image, index) => {
            formData.append(`images[${index}]`, image);
        });

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const response = await fetch(`${this.baseURL}/${productId}/images`, {
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
            throw new Error(data.message || 'Failed to upload images');
        }

        return data;
    }

    // Delete product image
    async deleteProductImage(productId: number, imageUrl: string): Promise<ApiResponse<null>> {
        return this.request<null>(`${this.baseURL}/${productId}/images`, {
            method: 'DELETE',
            body: JSON.stringify({ image_url: imageUrl }),
        });
    }
}

export const productDetailsService = new ProductDetailsService();