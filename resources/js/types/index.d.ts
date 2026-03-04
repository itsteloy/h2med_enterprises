import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    role?: 'admin' | 'staff' | 'pharmacist';
    [key: string]: unknown; // This allows for additional properties
}

// Pharmacy specific types
export interface MedicationItem {
    id: number;
    sku: string;
    name: string;
    category: string;
    stock: number;
    price: string;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    supplier: string;
    lastUpdated: string;
}

export interface MedicationCategory {
    id: number;
    name: string;
    description: string;
    products: number;
    created: string;
    status: 'Active' | 'Inactive';
}

export interface MedicationSupplier {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    contactPerson: string;
    activeProducts: number;
    lastOrder: string;
    paymentTerms: string;
    status: 'Active' | 'Inactive';
}

export interface StockCountItem {
    id: number;
    sku: string;
    name: string;
    category: string;
    systemStock: number;
    countedStock: number | null;
    variance: number | null;
    status: 'Pending' | 'Counted';
}

export interface MedicationDetails {
    id: number;
    sku: string;
    name: string;
    description: string;
    category: string;
    stock: number;
    threshold: number;
    price: string;
    costPrice: string;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    supplier: string;
    location: string;
    lastUpdated: string;
    expiryDate: string;
    barcode: string;
    unit: string;
    dosage: string;
    form: string;
    activeIngredient: string;
    rxRequired: boolean;
    weight: string;
    dimensions: string;
    images: string[];
    salesHistory: {
        month: string;
        sales: number;
    }[];
}

export interface Transaction {
    id: number;
    type: 'Sale' | 'Restock';
    quantity: number;
    date: string;
    staff: string;
}

export interface ReportData {
    title: string;
    description: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: LucideIcon;
    color: string;
}

export interface TimeframeOption {
    value: string;
    label: string;
}