// services/deliveryServices.ts

import { inventoryService, InventoryItem, StockAdjustmentData } from './inventoryServices';

// ===== INTERFACES =====

export interface DeliveryProduct {
  id?: number; // Inventory item ID
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  current_stock?: number;
  expiration_date?: string; // Per-item expiration date
}

export interface Delivery {
  id: number;
  reference_no: string;
  customer: string;
  phone?: string;
  delivery_date: string;
  expiration_date?: string;
  products?: DeliveryProduct[];
  status: 'pending' | 'terms' | 'paid';
  balance: number;
  payment?: number;
}

export interface DeliveryFormData {
  reference_no: string;
  customer: string;
  phone?: string;
  delivery_date: string;
  expiration_date?: string;
  products?: DeliveryProduct[];
  status: 'pending' | 'paid' | 'terms';
  balance: number;
  payment?: number;
  terms_payment?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, unknown>;
}

// ===== SERVICE CLASS =====
class DeliveryService {
  private baseURL = '/api/deliveries';

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
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

    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Unexpected response format from server');
    }

    const data = await response.json();

    if (!response.ok) {
      throw { message: data.message || `Request failed with status ${response.status}`, errors: data.errors || null };
    }

    return data as T;
  }

  async getDeliveries(): Promise<Delivery[]> {
    return this.request<Delivery[]>(this.baseURL);
  }

  async getDelivery(id: number): Promise<Delivery> {
    return this.request<Delivery>(`${this.baseURL}/${id}`);
  }

  async createDelivery(deliveryData: DeliveryFormData): Promise<Delivery> {
    return this.request<Delivery>(this.baseURL, {
      method: 'POST',
      body: JSON.stringify(deliveryData),
    });
  }

  async updateDelivery(id: number, deliveryData: Partial<DeliveryFormData>): Promise<Delivery> {
    return this.request<Delivery>(`${this.baseURL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deliveryData),
    });
  }

  async deleteDelivery(id: number): Promise<void> {
    await this.request<void>(`${this.baseURL}/${id}`, { method: 'DELETE' });
  }

  // ===== INVENTORY INTEGRATION METHODS =====

  async getAvailableInventory(): Promise<InventoryItem[]> {
    try {
      const response = await inventoryService.getItems({ per_page: 1000, status: 'active' });
      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  }

  async deductStockOnDelivery(products: DeliveryProduct[]): Promise<void> {
    console.log('Deducting stock for products:', products);
    for (const product of products) {
      if (product.id && product.quantity > 0) {
        try {
          console.log(`Deducting ${product.quantity} units for product ${product.name} (ID: ${product.id})`);
          await inventoryService.adjustStock(product.id, {
            quantity: product.quantity, // Positive quantity with type 'out' should deduct
            type: 'out',
            reason: 'Delivery',
            reference_number: `DEL-${Date.now()}`,
            notes: `Stock deducted for delivery: ${product.name}`
          } as StockAdjustmentData);
          console.log(`Successfully deducted stock for ${product.name}`);
        } catch (error) {
          console.error(`Failed to deduct stock for product ${product.name}:`, error);
          throw new Error(`Failed to deduct stock for ${product.name}`);
        }
      }
    }
  }

  async validateStockAvailability(products: DeliveryProduct[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const product of products) {
      if (product.id && product.quantity > 0) {
        try {
          const item = await inventoryService.getItem(product.id);
          const currentStock = item.data?.stock_quantity || 0;

          if (currentStock < product.quantity) {
            errors.push(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${product.quantity}`);
          }
        } catch {
          errors.push(`Unable to verify stock for ${product.name}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const deliveryService = new DeliveryService();