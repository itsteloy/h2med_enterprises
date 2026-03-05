import AppLayout from '@/layouts/app-layout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle, Calendar, CheckCircle, Clock, Download, Edit, PlusCircle, Printer, RefreshCw, Search, Trash2, Truck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Delivery, DeliveryFormData, DeliveryProduct, deliveryService } from '../../../services/deliveryServices';
import { InventoryItem } from '../../../services/inventoryServices';

// Extend DeliveryProduct to include searchTerm field
interface ExtendedDeliveryProduct extends DeliveryProduct {
    searchTerm?: string;
}

/* ================= STATUS BADGE ================= */
const getStatusBadge = (status: Delivery['status']) => {
    const styles: Record<Delivery['status'], string> = {
        pending: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border border-yellow-300',
        terms: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white border border-blue-300',
        paid: 'bg-gradient-to-r from-green-400 to-green-500 text-white border border-green-300',
    };

    return <span className={`${styles[status]} rounded px-2 py-1 text-xs font-bold uppercase`}>{status}</span>;
};

/* ================= DELIVERY MODAL ================= */
const DeliveryModal = ({
    isOpen,
    onClose,
    delivery,
    onSave,
    errors,
    setErrors,
}: {
    isOpen: boolean;
    onClose: () => void;
    delivery?: Delivery | null;
    onSave: (data: DeliveryFormData) => void;
    errors: Record<string, string[]>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}) => {
    const [formData, setFormData] = useState<DeliveryFormData>({
        reference_no: '',
        customer: '',
        phone: '',
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        balance: 0,
        payment: undefined,
        terms_payment: 0,
        products: [],
    });

    const [products, setProducts] = useState<ExtendedDeliveryProduct[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [stockErrors, setStockErrors] = useState<string[]>([]);

    // Fetch inventory items when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchInventoryItems();
        }
    }, [isOpen]);

    const fetchInventoryItems = async () => {
        setLoadingInventory(true);
        try {
            console.log('Fetching inventory items...');
            const items = await deliveryService.getAvailableInventory();
            console.log('Fetched inventory items:', items);
            setInventoryItems(items);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setInventoryItems([]);
        } finally {
            setLoadingInventory(false);
        }
    };

    useEffect(() => {
        if (delivery) {
            setFormData({
                reference_no: delivery.reference_no,
                customer: delivery.customer,
                phone: delivery.phone || '',
                delivery_date: delivery.delivery_date,
                expiration_date: delivery.expiration_date || '',
                status: delivery.status,
                balance: delivery.balance,
                payment: delivery.payment || undefined,
            });
            setProducts(delivery.products || []);
        } else {
            setFormData({
                reference_no: '',
                customer: '',
                phone: '',
                delivery_date: new Date().toISOString().split('T')[0],
                expiration_date: '',
                status: 'pending',
                balance: 0,
                payment: undefined,
                terms_payment: 0,
                products: [],
            });
            setProducts([]);
        }
        setErrors({});
    }, [delivery, isOpen]);

    // Logic: Auto calculate Delivery Amount, Status, and Expiration
    useEffect(() => {
        const totalAmount = products.reduce((sum, p) => sum + Number(p.quantity) * Number(p.price), 0);
        const currentPayment = Number(formData.payment || 0);
        const currentTermsPayment = Number(formData.terms_payment || 0);
        const totalPayments = currentPayment + currentTermsPayment;

        // Only auto-set status to Paid if total payments equal or exceed delivery amount
        // Keep existing status for Pending and Terms (manual selection)
        let newStatus = formData.status;
        if (totalPayments >= totalAmount && totalAmount > 0) {
            newStatus = 'paid'; // Auto-set to Paid only
        } else if (formData.status === 'paid' && totalPayments < totalAmount) {
            // If status was Paid but payment reduced, change to Terms
            newStatus = totalPayments > 0 ? 'terms' : 'pending';
        }

        // Auto-calculate expiration based on products
        let calculatedExpiration = '';
        const productsWithIds = products.filter((p) => p.id);
        if (productsWithIds.length > 0) {
            // Default to 30 days from delivery date for standard deliveries
            // You can customize this based on product types or business rules
            const deliveryDate = new Date(formData.delivery_date);
            deliveryDate.setDate(deliveryDate.getDate() + 30); // Add 30 days
            calculatedExpiration = deliveryDate.toISOString().split('T')[0];
        }

        setFormData((prev) => ({
            ...prev,
            balance: totalAmount,
            status: newStatus,
            expiration_date: calculatedExpiration,
        }));
    }, [products, formData.payment, formData.terms_payment, formData.delivery_date]);

    const handleProductChange = (index: number, field: keyof ExtendedDeliveryProduct, value: string | number) => {
        const updated = [...products];
        updated[index] = { ...updated[index], [field]: value };

        // If product is selected from inventory, auto-fill details and use actual expiration
        if (field === 'id' && typeof value === 'number') {
            const selectedItem = inventoryItems.find((item) => item.id === value);
            if (selectedItem) {
                // Format expiry date to show only date (YYYY-MM-DD)
                const expiryDate = selectedItem.expiry_date ? selectedItem.expiry_date.split('T')[0] : '';

                updated[index] = {
                    ...updated[index],
                    id: selectedItem.id,
                    name: selectedItem.name,
                    price: selectedItem.price,
                    sku: selectedItem.sku,
                    current_stock: selectedItem.stock_quantity,
                    expiration_date: expiryDate,
                    searchTerm: selectedItem.name, // Show selected product name in search bar
                };
            }
        }

        setProducts(updated);
        setStockErrors([]); // Clear stock errors when product changes
    };

    const addProduct = () => setProducts([...products, { name: '', quantity: 1, price: 0, searchTerm: '' }]);
    const removeProduct = (index: number) => setProducts(products.filter((_, i) => i !== index));

    const validateStockAvailability = async () => {
        const productsWithIds = products.filter((p) => p.id);
        if (productsWithIds.length === 0) return true;

        try {
            const validation = await deliveryService.validateStockAvailability(productsWithIds);
            setStockErrors(validation.errors);
            return validation.valid;
        } catch (error) {
            console.error('Stock validation error:', error);
            setStockErrors(['Unable to validate stock availability']);
            return false;
        }
    };

    // Determine if we should show/hide fields based on status
    const isPaid = formData.status === 'paid';
    const isPendingOrTerms = formData.status === 'pending' || formData.status === 'terms';

    // Calculate the remaining balance for Terms status
    const remainingBalance = formData.balance - (formData.payment || 0);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${!isOpen && 'hidden'}`}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between bg-[#000080] p-4 text-white">
                    <h2 className="text-lg font-bold">{delivery ? 'Edit Delivery Record' : 'Create New Delivery'}</h2>
                    <button onClick={onClose} className="rounded-full p-1 transition hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSave({ ...formData, products });
                    }}
                    className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Reference No.</label>
                            <input
                                type="text"
                                value={formData.reference_no}
                                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                className="w-full rounded border p-2 outline-none focus:ring-1 focus:ring-red-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Customer</label>
                            <input
                                type="text"
                                value={formData.customer}
                                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                                className="w-full rounded border p-2 outline-none focus:ring-1 focus:ring-red-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full rounded border p-2 outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Delivery Date</label>
                            <input
                                type="date"
                                value={formData.delivery_date}
                                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                                className="w-full rounded border p-2 outline-none focus:ring-1 focus:ring-red-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border bg-gray-50 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600 uppercase">Products Delivered</span>
                            {!delivery && (
                                <button
                                    type="button"
                                    onClick={addProduct}
                                    className="rounded bg-gray-800 px-3 py-1.5 text-[10px] text-white transition-colors hover:bg-black"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>

                        {/* Stock Errors Display */}
                        {stockErrors.length > 0 && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                                    <AlertTriangle size={16} />
                                    <span>Stock Issues:</span>
                                </div>
                                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-red-600">
                                    {stockErrors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="space-y-3">
                            {products.map((p, i) => (
                                <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                                    <div className="grid grid-cols-12 items-center gap-3">
                                        {/* Product Search Bar */}
                                        <div className="col-span-6">
                                            <label className="mb-1 block text-xs font-medium text-gray-600">Search Product</label>
                                            <div className="relative">
                                                <Search className="absolute top-2.5 left-2 text-gray-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search inventory by name or SKU..."
                                                    value={p.searchTerm || ''}
                                                    onChange={(e) => handleProductChange(i, 'searchTerm', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 py-2 pr-3 pl-8 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Search Results Dropdown */}
                                            {p.searchTerm && p.searchTerm.trim() !== '' && !p.id && (
                                                <div
                                                    className="fixed z-50 max-h-40 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg"
                                                    style={{
                                                        width: 'calc(100% - 48px)',
                                                        left: '50%',
                                                        top: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        maxWidth: '400px',
                                                    }}
                                                >
                                                    <div className="border-b border-gray-200 bg-gray-50 p-2">
                                                        <div className="text-xs font-medium text-gray-600">Search Results</div>
                                                    </div>
                                                    {inventoryItems.filter(
                                                        (item) =>
                                                            item.stock_quantity > 0 &&
                                                            (item.name.toLowerCase().includes(p.searchTerm?.toLowerCase() || '') ||
                                                                item.sku.toLowerCase().includes(p.searchTerm?.toLowerCase() || '')),
                                                    ).length > 0 ? (
                                                        inventoryItems
                                                            .filter(
                                                                (item) =>
                                                                    item.stock_quantity > 0 &&
                                                                    (item.name.toLowerCase().includes(p.searchTerm?.toLowerCase() || '') ||
                                                                        item.sku.toLowerCase().includes(p.searchTerm?.toLowerCase() || '')),
                                                            )
                                                            .map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => handleProductChange(i, 'id', item.id)}
                                                                    className="cursor-pointer border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-100"
                                                                >
                                                                    <div className="text-sm font-medium">{item.name}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        SKU: {item.sku} • Stock: {item.stock_quantity} • Price: ₱{item.price}
                                                                    </div>
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-gray-600">Quantity</label>
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={p.quantity}
                                                onChange={(e) => handleProductChange(i, 'quantity', e.target.value)}
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                required
                                                min="1"
                                                max={p.current_stock || 999}
                                            />
                                        </div>

                                        {/* Price */}
                                        <div className="col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-gray-600">Price</label>
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={p.price}
                                                onChange={(e) => handleProductChange(i, 'price', e.target.value)}
                                                className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
                                                readOnly
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Stock Info & Delete */}
                                        <div className="col-span-1 flex items-center justify-between">
                                            {p.current_stock !== undefined && (
                                                <div className="text-xs font-medium text-gray-500">Stock: {p.current_stock}</div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeProduct(i)}
                                                className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50"
                                                title="Remove item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Per-item Expiration Display */}
                                    {p.expiration_date && (
                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-orange-600">Item Expiration:</span>
                                                    <span className="text-xs font-bold text-orange-700">{p.expiration_date}</span>
                                                    <span className="text-xs text-gray-500">(from inventory record)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {products.length === 0 && (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    No items added yet. Click "Add Item" to start adding products.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                        {/* Delivery Amount field - always visible */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Delivery Amount</label>
                            <div className="relative">
                                <span className="absolute top-2 left-2 text-sm text-gray-400">₱</span>
                                <input
                                    type="number"
                                    value={formData.balance}
                                    className="w-full rounded border bg-gray-100 p-2 pl-6 font-bold"
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Payment Received field - always visible */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Payment Received</label>
                            <div className="relative">
                                <span className="absolute top-2 left-2 text-sm text-gray-400">₱</span>
                                <input
                                    type="number"
                                    value={formData.payment || ''}
                                    onChange={(e) => setFormData({ ...formData, payment: e.target.value ? parseFloat(e.target.value) : undefined })}
                                    className="w-full rounded border p-2 pl-6 outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        {/* Terms Payment field - always visible */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Terms Payment</label>
                            <div className="relative">
                                <span className="absolute top-2 left-2 text-sm text-gray-400">₱</span>
                                <input
                                    type="number"
                                    value={formData.terms_payment || 0}
                                    onChange={(e) => setFormData({ ...formData, terms_payment: parseFloat(e.target.value) || 0 })}
                                    className="w-full rounded border p-2 pl-6 outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                        {/* Status field - manual selection for Pending and Terms */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                                Status {formData.status === 'paid' && '(Auto-Paid)'}
                            </label>
                            {formData.status === 'paid' ? (
                                <div className="pt-2">{getStatusBadge(formData.status)}</div>
                            ) : (
                                <select
                                    value={formData.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as Delivery['status'];
                                        let updatedData = { ...formData, status: newStatus };

                                        // Auto-set deadline to 1 month from delivery date when status is Terms
                                        if (newStatus === 'terms') {
                                            const deliveryDate = new Date(formData.delivery_date);
                                            deliveryDate.setMonth(deliveryDate.getMonth() + 1); // Add 1 month
                                            updatedData.expiration_date = deliveryDate.toISOString().split('T')[0];
                                        }

                                        setFormData(updatedData);
                                    }}
                                    className="w-full rounded border border-gray-300 p-2 outline-none focus:ring-1 focus:ring-red-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="terms">Terms</option>
                                </select>
                            )}
                        </div>

                        {/* Deadline Date field - display when status is Terms */}
                        {formData.status === 'terms' && (
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Deadline Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.expiration_date || ''}
                                        onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                                        className="w-full rounded border bg-gray-100 p-2 outline-none focus:ring-1 focus:ring-red-500"
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-bold text-white transition hover:bg-black">
                            Save Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function DeliveryManagementPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'terms' | 'paid'>('all');
    const [successMessage, setSuccessMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
    const [lastDelivery, setLastDelivery] = useState<Delivery | null>(null);

    const ensureNumber = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        return 0;
    };

    const printDeliveryReceiptDirectly = (delivery: Delivery) => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            setSuccessMessage('Could not open print window. Please check your popup blocker.');
            setTimeout(() => setSuccessMessage(''), 5000);
            return;
        }

        const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Receipt - ${delivery.reference_no}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 10mm;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          
          .receipt-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          
          .receipt-header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 5px 0;
          }
          
          .receipt-header p {
            margin: 2px 0;
            font-size: 10px;
          }
          
          .receipt-info {
            margin-bottom: 10px;
            font-size: 11px;
          }
          
          .status-badge {
            background: #e8f5e9;
            border: 1px solid #4caf50;
            padding: 5px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            font-size: 11px;
          }
          
          .items-table td {
            padding: 3px 0;
            font-size: 11px;
          }
          
          .item-name {
            font-weight: bold;
          }
          
          .item-details {
            font-size: 10px;
            color: #666;
          }
          
          .totals {
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
          }
          
          .totals-row.grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          
          .payment-info {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #000;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>H2-MED Enterprises</h1>
          <p>Delivery Receipt</p>
          <p>Reference: ${delivery.reference_no}</p>
          <p>${new Date(delivery.delivery_date).toLocaleString()}</p>
        </div> 

        <div class="receipt-info">
          <p><strong>Customer:</strong> ${delivery.customer}</p>
          ${delivery.phone ? `<p><strong>Phone:</strong> ${delivery.phone}</p>` : ''}
          <div class="status-badge">
            STATUS: ${delivery.status.toUpperCase()}
            ${delivery.expiration_date ? `<br>Deadline: ${delivery.expiration_date}` : ''}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
                delivery.products
                    ?.map(
                        (item) => `
              <tr>
                <td colspan="4">
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">${item.quantity} x ₱${ensureNumber(item.price).toFixed(2)}</div>
                  ${item.sku ? `<div class="item-details">SKU: ${item.sku}</div>` : ''}
                </td>
              </tr>
              <tr>
                <td colspan="3"></td>
                <td style="text-align: right; font-weight: bold;">₱${(item.quantity * ensureNumber(item.price)).toFixed(2)}</td>
              </tr>
            `,
                    )
                    .join('') || '<tr><td colspan="4" style="text-align: center;">No items</td></tr>'
            }
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Delivery Amount:</span>
            <span>₱${ensureNumber(delivery.balance).toFixed(2)}</span>
          </div>
          
          ${
              delivery.payment
                  ? `
            <div class="totals-row">
              <span>Payment Received:</span>
              <span>₱${ensureNumber(delivery.payment).toFixed(2)}</span>
            </div>
          `
                  : ''
          }
          
          <div class="totals-row">
            <span>Remaining Balance:</span>
            <span>₱${(ensureNumber(delivery.balance) - ensureNumber(delivery.payment || 0)).toFixed(2)}</span>
          </div>
          
          <div class="totals-row grand-total">
            <span>TOTAL DELIVERY VALUE:</span>
            <span>₱${ensureNumber(delivery.balance).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="totals-row">
            <span>Payment Status:</span>
            <span style="text-transform: capitalize;">${delivery.status}</span>
          </div>
          ${
              delivery.payment
                  ? `
            <div class="totals-row">
              <span>Payment Method:</span>
              <span>Cash/Check</span>
            </div>
          `
                  : ''
          }
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>H2-MED Enterprises</p>
          <p style="margin-top: 10px; font-size: 9px;">This serves as your official delivery receipt</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const response = await deliveryService.getDeliveries();
            setDeliveries(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const handleSaveDelivery = async (data: DeliveryFormData) => {
        try {
            // For new deliveries, validate stock availability first
            if (!selectedDelivery?.id && data.products) {
                const productsWithIds = data.products.filter((p) => p.id);
                if (productsWithIds.length > 0) {
                    const validation = await deliveryService.validateStockAvailability(productsWithIds);
                    if (!validation.valid) {
                        // Set errors to show in modal
                        setErrors({ stock: validation.errors });
                        return;
                    }
                }
            }

            if (selectedDelivery?.id) {
                await deliveryService.updateDelivery(selectedDelivery.id, data);
                setSuccessMessage('Delivery record updated successfully!');
            } else {
                // Create delivery and deduct stock
                const newDelivery = await deliveryService.createDelivery(data);
                setSuccessMessage('🎉 Delivery record created successfully! New delivery has been added to system.');

                // Store the delivery for receipt printing
                setLastDelivery(newDelivery);

                // Deduct stock for products with IDs
                if (data.products) {
                    const productsWithIds = data.products.filter((p) => p.id);
                    console.log('Products with IDs for stock deduction:', productsWithIds);
                    if (productsWithIds.length > 0) {
                        try {
                            await deliveryService.deductStockOnDelivery(productsWithIds);

                            // Dispatch stock update event to notify Inventory component
                            window.dispatchEvent(
                                new CustomEvent('stockUpdate', {
                                    detail: {
                                        type: 'delivery',
                                        products: productsWithIds,
                                        timestamp: new Date().toISOString(),
                                    },
                                }),
                            );
                        } catch (stockError) {
                            console.error('Stock deduction failed:', stockError);
                            // Still show success but log the error
                        }
                    }
                }

                // Auto-print receipt after successful delivery creation
                setTimeout(() => {
                    if (newDelivery) {
                        printDeliveryReceiptDirectly(newDelivery);
                    }
                }, 100);
            }

            setShowModal(false);
            fetchDeliveries();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error: any) {
            setErrors(error.errors || {});
        }
    };

    const handleDeleteClick = (delivery: Delivery) => {
        setDeliveryToDelete(delivery);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (deliveryToDelete) {
            try {
                await deliveryService.deleteDelivery(deliveryToDelete.id);
                setSuccessMessage('Delivery record deleted successfully!');
                fetchDeliveries();

                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error('Error deleting delivery:', error);
                setSuccessMessage('Error deleting delivery record');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
            setShowDeleteModal(false);
            setDeliveryToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setDeliveryToDelete(null);
    };

    const handleStatusToggle = async (delivery: Delivery) => {
        if (delivery.status === 'terms') {
            try {
                // Update both status and payment amount to match delivery amount
                const updateData = {
                    ...delivery,
                    status: 'paid' as const,
                    payment: delivery.balance, // Set payment equal to delivery amount
                };

                await deliveryService.updateDelivery(delivery.id, updateData);
                setSuccessMessage('Delivery marked as Paid! Payment amount updated to match delivery amount.');
                fetchDeliveries();

                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error('Error updating delivery status:', error);
                setSuccessMessage('Error updating delivery status');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        }
    };

    const filtered = deliveries.filter((d) => {
        // Search term filter
        const matchesSearch =
            d.customer.toLowerCase().includes(searchTerm.toLowerCase()) || d.reference_no.toLowerCase().includes(searchTerm.toLowerCase());

        // Delivery date filter
        const matchesDate = !deliveryDateFilter || d.delivery_date === deliveryDateFilter;

        // Status filter
        const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

        return matchesSearch && matchesDate && matchesStatus;
    });

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, deliveryDateFilter, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    /* ================= EXPORT PDF (H2-MED DESIGN) ================= */
    const handleExportPDF = () => {
        // Only export deliveries that match the current filters (including date filter)
        const exportData = filtered;

        if (exportData.length === 0) {
            setSuccessMessage('No deliveries to export with current filters');
            setTimeout(() => setSuccessMessage(''), 3000);
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Header
        doc.setTextColor(255, 26, 26); // Red #ff1a1a
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('H2-MED Enterprises', 148, 20, { align: 'center' });

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(18);
        doc.text('DELIVERY REPORT', 148, 30, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Complete delivery tracking and payment status', 148, 35, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Generated: ${today}`, 15, 45);
        doc.text(`Total Records: ${exportData.length}`, 80, 45);

        // Add filter information
        if (deliveryDateFilter) {
            doc.text(`Filtered Date: ${deliveryDateFilter}`, 15, 52);
        }
        if (statusFilter !== 'all') {
            doc.text(`Filtered Status: ${statusFilter.toUpperCase()}`, 15, 57);
        }

        // Summary Boxes (Like the attachment)
        doc.setDrawColor(255, 26, 26);
        doc.setLineWidth(0.5);
        doc.line(15, 50, 282, 50);

        const totalValue = filtered.reduce((sum, d) => sum + d.balance, 0);
        const totalPending = filtered.filter((d) => d.status !== 'paid').length;

        autoTable(doc, {
            head: [['Total Items', 'Pending/Terms', 'Total Delivery Value']],
            body: [[filtered.length, totalPending, `P${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
            startY: 55,
            theme: 'plain',
            styles: { halign: 'center', fontSize: 12, fontStyle: 'bold' },
            headStyles: { textColor: [100, 100, 100], fontSize: 8, fontStyle: 'normal' },
        });

        // Main Data Table - Each product on separate rows
        const tableColumn = ['Ref No.', 'Customer', 'Phone', 'Product Name', 'Quantity', 'Price', 'Total', 'Date', 'Expiry', 'Balance', 'Status'];
        const tableRows: string[][] = [];

        filtered.forEach((d) => {
            if (d.products && d.products.length > 0) {
                // Add each product as a separate row
                d.products.forEach((p, index) => {
                    const quantity = Number(p.quantity) || 0;
                    const price = Number(p.price) || 0;
                    const productTotal = quantity * price;
                    // Calculate balance: 0 if paid, remaining balance if terms, otherwise full delivery balance
                    const displayBalance = d.status === 'paid' ? 0 : d.status === 'terms' ? d.balance - (d.payment || 0) : d.balance;

                    tableRows.push([
                        index === 0 ? d.reference_no : '', // Show ref no only on first product row
                        index === 0 ? d.customer : '', // Show customer only on first product row
                        index === 0 ? d.phone || '-' : '', // Show phone only on first product row
                        p.name || 'Unknown Product',
                        quantity.toString(),
                        `P${price.toFixed(2)}`,
                        `P${productTotal.toFixed(2)}`,
                        d.delivery_date, // Show date on each product row
                        d.expiration_date || '-', // Show expiry on each product row
                        `P${displayBalance.toFixed(2)}`, // Show balance on each product row (0 if paid)
                        d.status.toUpperCase(), // Show status on each product row
                    ]);
                });
            } else {
                // Add a single row for deliveries with no products
                const displayBalance = d.status === 'paid' ? 0 : d.status === 'terms' ? d.balance - (d.payment || 0) : d.balance;
                tableRows.push([
                    d.reference_no,
                    d.customer,
                    d.phone || '-',
                    'No Items',
                    '-',
                    '-',
                    '-',
                    d.delivery_date,
                    d.expiration_date || '-',
                    `P${displayBalance.toFixed(2)}`,
                    d.status.toUpperCase(),
                ]);
            }
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 85,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [255, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
        });

        doc.save(`H2MED_Delivery_Report_${new Date().getTime()}.pdf`);

        // Show success message
        setSuccessMessage('Delivery report exported successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6 flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900">DELIVERY MANAGEMENT</h1>
                            <p className="font-medium text-gray-500">H2-MED Enterprises | Logistics & Receivables</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                <Download size={16} /> Export PDF
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedDelivery(null);
                                    setShowModal(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-2 text-sm font-bold text-white transition hover:shadow-md"
                            >
                                <PlusCircle size={16} /> Add Delivery
                            </button>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {/* Pending Deliveries Card */}
                        <div className="group relative overflow-hidden rounded-xl border border-yellow-200/60 bg-white/90 p-4 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-300/80 hover:shadow-lg">
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-gradient-to-br from-yellow-200/20 to-amber-200/20 blur-xl"></div>

                            {/* Icon */}
                            <div className="absolute relative top-3 right-3 z-10">
                                <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 p-2 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-yellow-300/50">
                                    <Clock size={14} className="text-white" />
                                </div>
                            </div>

                            <div className="relative z-10 space-y-3">
                                <div>
                                    <p className="mb-2 text-xs font-bold tracking-wider text-yellow-700/80 uppercase">Pending Deliveries</p>
                                    <div className="flex items-end gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400 shadow-md shadow-yellow-400/50"></div>
                                            <p className="text-2xl font-black text-gray-900">
                                                {filtered.filter((d) => d.status === 'pending').length}
                                            </p>
                                        </div>
                                        <span className="mb-0.5 text-xs font-semibold text-yellow-600/80">items</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-yellow-200/50 bg-gradient-to-r from-yellow-50/80 to-amber-50/80 p-3 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold tracking-wider text-yellow-700/90 uppercase">Total Value</p>
                                        <p className="text-sm font-black text-gray-900">
                                            ₱
                                            {filtered
                                                .filter((d) => d.status === 'pending')
                                                .reduce((sum, d) => sum + d.balance, 0)
                                                .toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Terms Deliveries Card */}
                        <div className="group relative overflow-hidden rounded-xl border border-blue-200/60 bg-white/90 p-4 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg">
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-gradient-to-br from-blue-200/20 to-cyan-200/20 blur-xl"></div>

                            {/* Icon */}
                            <div className="absolute relative top-3 right-3 z-10">
                                <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 p-2 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-300/50">
                                    <Calendar size={14} className="text-white" />
                                </div>
                            </div>

                            <div className="relative z-10 space-y-3">
                                <div>
                                    <p className="mb-2 text-xs font-bold tracking-wider text-blue-700/80 uppercase">Terms Deliveries</p>
                                    <div className="flex items-end gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 shadow-md shadow-blue-400/50"></div>
                                            <p className="text-2xl font-black text-gray-900">{filtered.filter((d) => d.status === 'terms').length}</p>
                                        </div>
                                        <span className="mb-0.5 text-xs font-semibold text-blue-600/80">items</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-cyan-50/80 p-3 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold tracking-wider text-blue-700/90 uppercase">Remaining Balance</p>
                                        <p className="text-sm font-black text-gray-900">
                                            ₱
                                            {filtered
                                                .filter((d) => d.status === 'terms')
                                                .reduce((sum, d) => sum + (d.balance - (d.payment || 0)), 0)
                                                .toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Paid Deliveries Card */}
                        <div className="group relative overflow-hidden rounded-xl border border-green-200/60 bg-white/90 p-4 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-green-300/80 hover:shadow-lg">
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-gradient-to-br from-green-200/30 to-emerald-200/30 blur-xl"></div>

                            {/* Icon */}
                            <div className="absolute relative top-3 right-3 z-10">
                                <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-2 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-green-300/50">
                                    <CheckCircle size={14} className="text-white" />
                                </div>
                            </div>

                            <div className="relative z-10 space-y-3">
                                <div>
                                    <p className="mb-2 text-xs font-bold tracking-wider text-green-700/90 uppercase">Paid Deliveries</p>
                                    <div className="flex items-end gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 shadow-md shadow-green-400/50"></div>
                                            <p className="text-2xl font-black text-gray-900">{filtered.filter((d) => d.status === 'paid').length}</p>
                                        </div>
                                        <span className="mb-0.5 text-xs font-semibold text-green-600/80">items</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80 p-3 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold tracking-wider text-green-700/90 uppercase">Total Value</p>
                                        <p className="text-sm font-black text-gray-900">
                                            ₱
                                            {filtered
                                                .filter((d) => d.status === 'paid')
                                                .reduce((sum, d) => sum + d.balance, 0)
                                                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-12 gap-4">
                            {/* Search */}
                            <div className="col-span-4">
                                <label className="mb-1 block text-xs font-medium text-gray-600">Search</label>
                                <div className="relative">
                                    <Search className="absolute top-2.5 left-3 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Customer or reference..."
                                        className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-[#ff1a1a]"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="col-span-3">
                                <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'terms' | 'paid')}
                                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-[#ff1a1a]"
                                >
                                    <option value="all">All ({deliveries.length})</option>
                                    <option value="pending">Pending ({deliveries.filter((d) => d.status === 'pending').length})</option>
                                    <option value="terms">Terms ({deliveries.filter((d) => d.status === 'terms').length})</option>
                                    <option value="paid">Paid ({deliveries.filter((d) => d.status === 'paid').length})</option>
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div className="col-span-3">
                                <label className="mb-1 block text-xs font-medium text-gray-600">Delivery Date</label>
                                <input
                                    type="date"
                                    value={deliveryDateFilter}
                                    onChange={(e) => setDeliveryDateFilter(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-[#ff1a1a]"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="col-span-2 flex gap-2">
                                <button
                                    onClick={fetchDeliveries}
                                    className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50"
                                    title="Refresh data"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={() => {
                                        setDeliveryDateFilter('');
                                        setStatusFilter('all');
                                        setSearchTerm('');
                                    }}
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-50"
                                    title="Clear all filters"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Filter Results Info */}
                        {(statusFilter !== 'all' || deliveryDateFilter || searchTerm) && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing <span className="font-semibold text-blue-600">{filtered.length}</span> of {deliveries.length}{' '}
                                        deliveries
                                        {statusFilter !== 'all' && (
                                            <span className="ml-2">
                                                • Status: <span className="font-semibold capitalize">{statusFilter}</span>
                                            </span>
                                        )}
                                        {deliveryDateFilter && (
                                            <span className="ml-2">
                                                • Date: <span className="font-semibold">{deliveryDateFilter}</span>
                                            </span>
                                        )}
                                        {searchTerm && (
                                            <span className="ml-2">
                                                • Search: <span className="font-semibold">"{searchTerm}"</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                        <table className="w-full text-left">
                            <thead className="border-b bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Reference</th>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Customer</th>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Balance</th>
                                    <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((d) => (
                                        <tr key={d.id} className="transition hover:bg-gray-50">
                                            <td className="px-4 py-2 font-bold text-gray-700">{d.reference_no}</td>
                                            <td className="px-4 py-2">
                                                <div className="font-semibold">{d.customer}</div>
                                                <div className="text-xs text-gray-400">{d.phone || 'No phone'}</div>
                                            </td>
                                            <td className="px-4 py-2 text-sm">{d.delivery_date}</td>
                                            <td className="px-4 py-2 font-bold">₱{d.balance.toLocaleString()}</td>
                                            <td className="px-4 py-2 font-bold text-red-600">₱{(d.balance - (d.payment || 0)).toLocaleString()}</td>
                                            <td className="px-4 py-2">
                                                {d.status === 'terms' ? (
                                                    <button
                                                        onClick={() => handleStatusToggle(d)}
                                                        className="inline-flex cursor-pointer items-center gap-2 rounded bg-gradient-to-r from-blue-400 to-blue-500 px-3 py-1 text-xs font-bold text-white uppercase shadow-sm transition-all duration-200 hover:from-green-400 hover:to-green-500 hover:shadow-md"
                                                        title="Click to mark as Paid"
                                                    >
                                                        <CheckCircle size={12} />
                                                        Terms → Paid
                                                    </button>
                                                ) : (
                                                    getStatusBadge(d.status)
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => printDeliveryReceiptDirectly(d)}
                                                        className="rounded p-1.5 text-green-600 transition-colors hover:bg-green-50"
                                                        title="Print Receipt"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDelivery(d);
                                                            setShowModal(true);
                                                        }}
                                                        className="rounded p-1.5 text-[#ff1a1a] hover:bg-red-50"
                                                        title="Edit Delivery"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(d)}
                                                        className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50"
                                                        title="Delete Delivery"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Truck size={40} className="text-gray-300" />
                                                <p className="text-lg font-medium">No deliveries found</p>
                                                <p className="text-sm">Try adjusting your search or filter criteria</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                                <span className="font-semibold">{Math.min(endIndex, filtered.length)}</span> of{' '}
                                <span className="font-semibold">{filtered.length}</span> deliveries
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages).keys()].map((page) => {
                                        const pageNum = page + 1;
                                        // Show first page, last page, and pages around current page
                                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                                                        currentPage === pageNum
                                                            ? 'bg-[#ff1a1a] text-white'
                                                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                            return (
                                                <span key={pageNum} className="flex h-8 w-8 items-center justify-center text-gray-500">
                                                    ...
                                                </span>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="fixed top-4 right-4 z-50 rounded-lg border border-red-200 bg-red-50 p-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                        <CheckCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-red-800">{successMessage}</p>
                                </div>
                                <button onClick={() => setSuccessMessage('')} className="flex-shrink-0 text-red-600 transition hover:text-red-800">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    <DeliveryModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        delivery={selectedDelivery}
                        onSave={handleSaveDelivery}
                        errors={errors}
                        setErrors={setErrors}
                    />

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && deliveryToDelete && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-screen items-center justify-center p-4">
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleDeleteCancel}></div>

                                <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                    {/* Modal Header */}
                                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold">Delete Delivery Record</h3>
                                            <button onClick={handleDeleteCancel} className="rounded-full p-1 transition hover:bg-white/20">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="p-6">
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                            <Trash2 size={32} className="text-red-600" />
                                        </div>

                                        <div className="mb-6 text-center">
                                            <h4 className="mb-2 text-lg font-semibold text-gray-900">
                                                Are you sure you want to delete this delivery?
                                            </h4>
                                            <p className="mb-4 text-gray-600">
                                                This action cannot be undone. All delivery information will be permanently removed.
                                            </p>

                                            {/* Delivery Details */}
                                            <div className="rounded-lg bg-gray-50 p-4 text-left">
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Reference:</span>
                                                        <span className="font-medium">{deliveryToDelete.reference_no}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Customer:</span>
                                                        <span className="font-medium">{deliveryToDelete.customer}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Date:</span>
                                                        <span className="font-medium">{deliveryToDelete.delivery_date}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Amount:</span>
                                                        <span className="font-bold text-red-600">₱{deliveryToDelete.balance.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Modal Actions */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleDeleteCancel}
                                                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteConfirm}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:from-red-600 hover:to-red-700"
                                            >
                                                <Trash2 size={16} />
                                                Delete Permanently
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
