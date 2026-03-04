import AppLayout from '@/layouts/app-layout';
import { ShoppingCart, Search, CreditCard, Printer, RotateCcw, Plus, Minus, X, Package, Receipt, Eye, Percent, UserCheck, Users } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { categoryService, Category } from '../../../services/categoryServices';
import { posService, POSProduct, Transaction as POSTransaction } from '../../../services/posServices';
import React from "react";

interface CartItem {
    id: number;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    stock_quantity: number;
    unit: string;
}

interface DiscountInfo {
    type: 'none' | 'senior' | 'pwd' | 'general';
    rate: number;
    amount: number;
}

// Using POSTransaction from posServices instead

interface POSStats {
    daily_sales: number;
    transactions_today: number;
    popular_items: Array<{
        id: number;
        name: string;
        sales_count: number;
    }>;
}

export default function PointOfSalePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { auth } = usePage().props as any;
    const currentUser = auth.user;
    
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'gcash'>('cash');
    const [cashAmount, setCashAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<POSTransaction[]>([]);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<POSTransaction | null>(null);
    const [stats, setStats] = useState<POSStats>({
        daily_sales: 0,
        transactions_today: 0,
        popular_items: []
    });

    const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
    const [isPWD, setIsPWD] = useState(false);
    const [seniorId, setSeniorId] = useState('');
    const [pwdId, setPwdId] = useState('');
    const [seniorDiscountRate, setSeniorDiscountRate] = useState(20);
    const [pwdDiscountRate, setPwdDiscountRate] = useState(20);
    const [generalDiscountRate, setGeneralDiscountRate] = useState(0);
    const [showDiscountOptions, setShowDiscountOptions] = useState(false);

    // Local input states to prevent focus loss
    const [seniorDiscountInput, setSeniorDiscountInput] = useState('20');
    const [pwdDiscountInput, setPwdDiscountInput] = useState('20');
    const [generalDiscountInput, setGeneralDiscountInput] = useState('0');

    // Image view modal state
    const [viewingImage, setViewingImage] = useState<{ src: string; name: string } | null>(null);

    // Recent Transactions dropdown state
    const [showRecentTransactions, setShowRecentTransactions] = useState(false);

    const VAT_RATE = 0.12;

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const ensureNumber = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        return 0;
    };

    const calculateSubtotal = () => {
        if (!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((sum, item) => {
            const price = ensureNumber(item?.price || 0);
            const quantity = item?.quantity || 0;
            return sum + (price * quantity);
        }, 0);
    };

    const calculateDiscount = (): DiscountInfo => {
        const subtotal = calculateSubtotal();
        let discountRate = 0;
        let discountType: 'none' | 'senior' | 'pwd' | 'general' = 'none';

        if (isSeniorCitizen) {
            discountRate = seniorDiscountRate / 100;
            discountType = 'senior';
        } else if (isPWD) {
            discountRate = pwdDiscountRate / 100;
            discountType = 'pwd';
        } else if (generalDiscountRate > 0) {
            discountRate = generalDiscountRate / 100;
            discountType = 'general';
        }

        const discountAmount = subtotal * discountRate;

        return {
            type: discountType,
            rate: discountRate,
            amount: discountAmount
        };
    };

    const calculateDiscountedSubtotal = () => {
        const subtotal = calculateSubtotal();
        const discount = calculateDiscount();
        return subtotal - discount.amount;
    };

    const calculateVAT = () => {
        const discountedSubtotal = calculateDiscountedSubtotal();
        return discountedSubtotal * VAT_RATE;
    };

    const calculateTotal = () => {
        return calculateDiscountedSubtotal() + calculateVAT();
    };

    const calculateChange = () => {
        if (paymentMethod === 'cash' && cashAmount) {
            const cash = parseFloat(cashAmount) || 0;
            const total = calculateTotal();
            return cash - total;
        }
        return 0;
    };

    const resetDiscounts = () => {
        setIsSeniorCitizen(false);
        setIsPWD(false);
        setSeniorId('');
        setPwdId('');
        setSeniorDiscountRate(20);
        setPwdDiscountRate(20);
        setGeneralDiscountRate(0);
        // Reset input states
        setSeniorDiscountInput('20');
        setPwdDiscountInput('20');
        setGeneralDiscountInput('0');
    };

    const printReceiptDirectly = (transaction: POSTransaction) => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showNotification('error', 'Could not open print window. Please check your popup blocker.');
            return;
        }

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${transaction.receipt_number}</title>
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
                    
                    .discount-badge {
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
                    
                    .totals-row.discount {
                        color: #d32f2f;
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
                    <p>Point of Sale System</p>
                    <p>Receipt: ${transaction.receipt_number}</p>
                    <p>${new Date(transaction.created_at || new Date().toISOString()).toLocaleString()}</p>
                    <p>Cashier: ${currentUser?.name || 'Unknown'}</p>
                </div>

                <div class="receipt-info">
                    ${transaction.customer_name ? `<p><strong>Customer:</strong> ${transaction.customer_name}</p>` : ''}
                    ${transaction.is_senior_citizen || transaction.is_pwd ? `
                        <div class="discount-badge">
                            ${transaction.is_senior_citizen ? `SENIOR CITIZEN DISCOUNT (${transaction.discount ? (transaction.discount.rate * 100).toFixed(1) : '0'}%)` : `PWD DISCOUNT (${transaction.discount ? (transaction.discount.rate * 100).toFixed(1) : '0'}%)`}
                            ${transaction.is_senior_citizen && transaction.senior_id ? `<br>ID: ${transaction.senior_id}` : ''}
                            ${transaction.is_pwd && transaction.pwd_id ? `<br>ID: ${transaction.pwd_id}` : ''}
                        </div>
                    ` : ''}
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
                        ${transaction.items.map((item) => `
                            <tr>
                                <td colspan="4">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">${item.quantity} x ₱${item.price.toFixed(2)}</div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3"></td>
                                <td style="text-align: right; font-weight: bold;">₱${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>₱${ensureNumber(transaction.subtotal).toFixed(2)}</span>
                    </div>
                    
                    ${transaction.discount && transaction.discount.amount > 0 ? `
                        <div class="totals-row discount">
                            <span>Discount (${(transaction.discount.rate * 100).toFixed(1)}%):</span>
                            <span>-₱${transaction.discount.amount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="totals-row">
                        <span>VAT (12%):</span>
                        <span>₱${ensureNumber(transaction.vat).toFixed(2)}</span>
                    </div>
                    
                    <div class="totals-row grand-total">
                        <span>TOTAL:</span>
                        <span>₱${ensureNumber(transaction.total).toFixed(2)}</span>
                    </div>
                </div>

                <div class="payment-info">
                    <div class="totals-row">
                        <span>Payment Method:</span>
                        <span style="text-transform: capitalize;">${transaction.payment_method}</span>
                    </div>
                    ${transaction.cash_amount ? `
                        <div class="totals-row">
                            <span>Cash Received:</span>
                            <span>₱${ensureNumber(transaction.cash_amount).toFixed(2)}</span>
                        </div>
                        <div class="totals-row">
                            <span>Change:</span>
                            <span>₱${ensureNumber(transaction.change).toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>Thank you for your purchase!</p>
                    <p>Have a great day!</p>
                    <p style="margin-top: 10px; font-size: 9px;">This serves as your official receipt</p>
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

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                per_page: 50,
                ...(searchTerm && { search: searchTerm }),
                ...(selectedCategory !== 'All' && { category_id: selectedCategory })
            };

            const response = await posService.getProducts(params);
            setProducts(Array.isArray(response?.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching products:', error);
            showNotification('error', 'Failed to fetch products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoryService.getActiveCategories();
            setCategories(Array.isArray(response?.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([]);
        }
    };

    const fetchPOSStats = async () => {
        try {
            const response = await posService.getStats();
            const statsData = response?.data || {};
            
            setStats({
                daily_sales: statsData.daily_sales || 0,
                transactions_today: statsData.transactions_today || 0,
                popular_items: Array.isArray(statsData.popular_items) ? statsData.popular_items : []
            });
        } catch (error) {
            console.error('Error fetching POS stats:', error);
            setStats({
                daily_sales: 0,
                transactions_today: 0,
                popular_items: []
            });
        }
    };

    const fetchRecentTransactions = async () => {
        try {
            const response = await posService.getRecentTransactions();
            const safeTransactions: POSTransaction[] = Array.isArray(response?.data) ? response.data.map(transaction => ({
                ...transaction,
                items: Array.isArray(transaction?.items) ? transaction.items : [],
                customer_name: transaction?.customer_name,
                receipt_number: transaction?.receipt_number ?? undefined,
                payment_method: transaction?.payment_method || 'cash',
                total: ensureNumber(transaction?.total || 0),
                subtotal: ensureNumber(transaction?.subtotal || 0),
                vat: ensureNumber(transaction?.vat || 0),
                cash_amount: ensureNumber(transaction?.cash_amount || 0),
                change: ensureNumber(transaction?.change || 0),
                created_at: transaction?.created_at || new Date().toISOString()
            })) : [];
            
            setRecentTransactions(safeTransactions);
        } catch (error) {
            console.error('Error fetching recent transactions:', error);
            setRecentTransactions([]);
        }
    };

    const addToCart = (product: POSProduct) => {
        if (!product || !product.id) return;
        
        const existingItem = Array.isArray(cart) ? cart.find(item => item?.id === product.id) : null;
        
        if (existingItem) {
            if (existingItem.quantity >= (product.stock_quantity || 0)) {
                showNotification('error', `Only ${product.stock_quantity || 0} ${product.unit || 'units'} available in stock`);
                return;
            }
            setCart(prevCart => 
                Array.isArray(prevCart) ? prevCart.map(item =>
                    item?.id === product.id
                        ? { ...item, quantity: (item.quantity || 0) + 1 }
                        : item
                ) : []
            );
        } else {
            const cartItem: CartItem = {
                id: product.id,
                sku: product.sku || '',
                name: product.name || '',
                price: ensureNumber(product.price),
                quantity: 1,
                stock_quantity: product.stock_quantity || 0,
                unit: product.unit || 'pcs'
            };
            setCart(prevCart => Array.isArray(prevCart) ? [...prevCart, cartItem] : [cartItem]);
        }
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (!id || quantity < 0) return;
        
        if (quantity <= 0) {
            removeFromCart(id);
            return;
        }

        const item = Array.isArray(cart) ? cart.find(item => item?.id === id) : null;
        if (item && quantity > (item.stock_quantity || 0)) {
            showNotification('error', `Only ${item.stock_quantity || 0} ${item.unit || 'units'} available in stock`);
            return;
        }

        setCart(prevCart => 
            Array.isArray(prevCart) ? prevCart.map(item =>
                item?.id === id ? { ...item, quantity } : item
            ) : []
        );
    };

    const removeFromCart = (id: number) => {
        if (!id) return;
        setCart(prevCart => Array.isArray(prevCart) ? prevCart.filter(item => item?.id !== id) : []);
    };

    const clearCart = () => {
        setCart([]);
        setCustomerName('');
        setCashAmount('');
        setPaymentMethod('cash');
        resetDiscounts();
    };

    const processTransaction = async () => {
        if (!Array.isArray(cart) || cart.length === 0) {
            showNotification('error', 'Cart is empty');
            return;
        }

        if (isSeniorCitizen && !seniorId.trim()) {
            showNotification('error', 'Senior Citizen ID is required');
            return;
        }

        if (isPWD && !pwdId.trim()) {
            showNotification('error', 'PWD ID is required');
            return;
        }

        const validation = posService.validateTransaction(
            cart, 
            paymentMethod, 
            parseFloat(cashAmount || '0'), 
            calculateTotal(),
            isSeniorCitizen,
            seniorId,
            isPWD,
            pwdId
        );
        
        if (!validation.valid) {
            showNotification('error', validation.errors[0] || 'Transaction validation failed');
            return;
        }

        setProcessing(true);
        try {
            const discount = calculateDiscount();
            const subtotal = calculateSubtotal();
            const vatAmount = calculateVAT();
            const total = calculateTotal();
            
            const transactionData = {
                customer_name: customerName || undefined,
                items: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: ensureNumber(item.price)
                })),
                subtotal: subtotal,
                discount_rate: discount.rate,
                discount_amount: discount.amount,
                vat: vatAmount,
                total: total,
                payment_method: paymentMethod,
                cash_amount: paymentMethod === 'cash' ? parseFloat(cashAmount || '0') : undefined,
                is_senior_citizen: isSeniorCitizen,
                senior_id: isSeniorCitizen ? seniorId : undefined,
                is_pwd: isPWD,
                pwd_id: isPWD ? pwdId : undefined
            };

            const response = await posService.processTransaction(transactionData);
            
            const transactionItems = Array.isArray(cart) ? cart.map(item => ({
                id: item?.id || 0,
                sku: item?.sku || '',
                name: item?.name || '',
                price: ensureNumber(item?.price || 0),
                quantity: item?.quantity || 0,
                total: (item?.quantity || 0) * ensureNumber(item?.price || 0)
            })) : [];

            const safeTransaction: POSTransaction = {
                id: response?.data?.id || Date.now(),
                receipt_number: response?.data?.receipt_number || `POS-${Date.now()}`,
                customer_name: response?.data?.customer_name ?? customerName,
                subtotal: ensureNumber(response?.data?.subtotal || subtotal),
                discount: discount,
                discounted_subtotal: calculateDiscountedSubtotal(),
                vat: ensureNumber(response?.data?.vat || vatAmount),
                total: ensureNumber(response?.data?.total || total),
                payment_method: response?.data?.payment_method || paymentMethod,
                cash_amount: ensureNumber(response?.data?.cash_amount || (paymentMethod === 'cash' ? parseFloat(cashAmount || '0') : 0)),
                change: ensureNumber(response?.data?.change || (paymentMethod === 'cash' ? calculateChange() : 0)),
                created_at: response?.data?.created_at || new Date().toISOString(),
                items: transactionItems,
                is_senior_citizen: isSeniorCitizen,
                senior_id: seniorId,
                is_pwd: isPWD,
                pwd_id: pwdId
            };

            setLastTransaction(safeTransaction);
            
            setTimeout(() => {
                printReceiptDirectly(safeTransaction);
            }, 100);
            
            clearCart();
            resetDiscounts();
            
            fetchProducts();
            fetchPOSStats();
            fetchRecentTransactions();
            showNotification('success', response.message || 'Transaction completed successfully');
        } catch (error) {
            console.error('Transaction error:', error);
            showNotification('error', error instanceof Error ? error.message : 'Failed to process transaction');
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchPOSStats();
        fetchRecentTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, selectedCategory]);


const DiscountModal = React.memo(function DiscountModal() {
  if (!showDiscountOptions) return null;

  // 🔥 STABLE HANDLERS (prevents re-renders while typing)

const closeDiscountModal = React.useCallback(() => {
  setShowDiscountOptions(false);
}, []);

const handleSeniorToggle = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsSeniorCitizen(checked);

    if (checked) {
      setIsPWD(false);
      setGeneralDiscountRate(0);
      setGeneralDiscountInput('0');
    }
  },
  []
);

const handlePwdToggle = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsPWD(checked);

    if (checked) {
      setIsSeniorCitizen(false);
      setGeneralDiscountRate(0);
      setGeneralDiscountInput('0');
    }
  },
  []
);

const handleSeniorIdChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeniorId(e.target.value);
  },
  []
);

const handlePwdIdChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwdId(e.target.value);
  },
  []
);

const handleSeniorDiscountChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeniorDiscountInput(e.target.value);
  },
  []
);

const handlePwdDiscountChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwdDiscountInput(e.target.value);
  },
  []
);

const handleGeneralDiscountChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralDiscountInput(e.target.value);
  },
  []
);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        
        {/* BACKDROP */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={closeDiscountModal}
        />

        {/* MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] flex flex-col"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                Apply Discount
              </h2>
              <button
                onClick={closeDiscountModal}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            
            {/* SENIOR */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <UserCheck className="h-4 w-4 text-blue-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">
                      Senior Citizen
                    </h3>
                    <p className="text-xs text-gray-500">
                      Discount (ID Required)
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isSeniorCitizen}
                  onChange={handleSeniorToggle}
                  className="w-4 h-4 text-[#ff1a1a] rounded"
                />
              </div>

              {isSeniorCitizen && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={seniorDiscountInput}
                        onChange={handleSeniorDiscountChange}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                        placeholder="20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senior Citizen ID *
                    </label>
                    <input
                      type="text"
                      value={seniorId ?? ''}
                      onChange={handleSeniorIdChange}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="numeric"
                      placeholder="Enter Senior Citizen ID"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* PWD */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-purple-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">PWD</h3>
                    <p className="text-xs text-gray-500">
                      Discount (ID Required)
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isPWD}
                  onChange={handlePwdToggle}
                  className="w-4 h-4 text-[#ff1a1a] rounded"
                />
              </div>

              {isPWD && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={pwdDiscountInput}
                        onChange={handlePwdDiscountChange}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                        placeholder="20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PWD ID *
                    </label>
                    <input
                      type="text"
                      value={pwdId ?? ''}
                      onChange={handlePwdIdChange}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="numeric"
                      placeholder="Enter PWD ID"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GENERAL */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center mb-3">
                <Percent className="h-4 w-4 text-orange-600 mr-2" />
                <h3 className="font-medium text-gray-900 text-sm">
                  General Discount
                </h3>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={generalDiscountInput}
                  onChange={handleGeneralDiscountChange}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="0"
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xs">%</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Maximum 50% discount allowed
              </p>
            </div>

            {/* CLEAR */}
            <button
              onClick={resetDiscounts}
              className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Clear All Discounts
            </button>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end space-x-2 p-4 pt-0 flex-shrink-0 border-t border-gray-100">
            <button
              onClick={closeDiscountModal}
              className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:from-[#ff3333] hover:to-[#ff4444] transition-all font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

    const ReceiptModal = () => {
        if (!showReceipt || !lastTransaction) return null;

        const printReceipt = () => {
            printReceiptDirectly(lastTransaction);
            setShowReceipt(false);
        };

        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowReceipt(false)}></div>
                    
                    <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                        <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">Receipt Preview</h2>
                                <button 
                                    onClick={() => setShowReceipt(false)} 
                                    className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="text-center mb-3">
                                <h3 className="text-lg font-bold">H2-MED Enterprises</h3>
                                <p className="text-sm text-gray-600">Point of Sale</p>
                                <p className="text-xs text-gray-500">Receipt: {lastTransaction.receipt_number}</p>
                                <p className="text-xs text-gray-500">{new Date(lastTransaction.created_at!).toLocaleString()}</p>
                            </div>

                            {lastTransaction.customer_name && (
                                <div className="mb-4">
                                    <p className="text-sm"><strong>Customer:</strong> {lastTransaction.customer_name}</p>
                                </div>
                            )}

                            {(lastTransaction.is_senior_citizen || lastTransaction.is_pwd) && (
                                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Discount Type:</strong> {lastTransaction.is_senior_citizen ? 'Senior Citizen' : 'PWD'} ({lastTransaction.discount ? (lastTransaction.discount.rate * 100).toFixed(1) : '0'}%)
                                    </p>
                                    {lastTransaction.senior_id && (
                                        <p className="text-xs text-blue-600">Senior ID: {lastTransaction.senior_id}</p>
                                    )}
                                    {lastTransaction.pwd_id && (
                                        <p className="text-xs text-blue-600">PWD ID: {lastTransaction.pwd_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="border-t border-b border-gray-200 py-3 mb-3">
                                {lastTransaction.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center mb-2">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} x ₱{item.price.toFixed(2)}</p>
                                        </div>
                                        <p className="text-sm font-medium">₱{(item.quantity * item.price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 mb-3">
                                <div className="flex justify-between">
                                    <span className="text-sm">Subtotal:</span>
                                    <span className="text-sm">₱{ensureNumber(lastTransaction?.subtotal || 0).toFixed(2)}</span>
                                </div>
                                
                                {lastTransaction.discount && lastTransaction.discount.amount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span className="text-sm">Discount ({(lastTransaction.discount.rate * 100).toFixed(1)}%):</span>
                                        <span className="text-sm">-₱{lastTransaction.discount.amount.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between">
                                    <span className="text-sm">VAT (12%):</span>
                                    <span className="text-sm">₱{ensureNumber(lastTransaction?.vat || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span>₱{ensureNumber(lastTransaction?.total || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between">
                                    <span className="text-sm">Payment Method:</span>
                                    <span className="text-sm capitalize">{lastTransaction.payment_method}</span>
                                </div>
                                {lastTransaction?.cash_amount && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Cash Received:</span>
                                            <span className="text-sm">₱{ensureNumber(lastTransaction?.cash_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Change:</span>
                                            <span className="text-sm">₱{ensureNumber(lastTransaction?.change || 0).toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="text-center text-xs text-gray-500">
                                <p>Thank you for your purchase!</p>
                                <p>Have a great day!</p>
                            </div>
                        </div>

                        <div className="flex justify-center space-x-2 p-4 pt-0">
                            <button
                                onClick={printReceipt}
                                className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:from-[#ff3333] hover:to-[#ff4444] transition-all font-medium"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Again
                            </button>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const Notification = () => {
        if (!notification) return null;

        const bgColor = notification.type === 'success' 
            ? 'bg-gradient-to-r from-[#ff1a1a] to-[#ff3333]' 
            : 'bg-gradient-to-r from-red-500 to-red-600';
        
        return (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
                <div className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm`}>
                    <div className="flex items-center justify-between">
                        <div className="font-medium">{notification.message}</div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="ml-3 rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-6">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] p-2 rounded-xl mr-3">
                                <ShoppingCart className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                                <p className="text-gray-600 mt-1">Process sales transactions - Cashier: {currentUser?.name || 'Unknown'}</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <Link href="/admin/purchases" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm font-medium">
                                <Eye className="h-4 w-4 mr-2" />
                                View Purchases
                            </Link>
                            <button 
                                onClick={clearCart}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm font-medium"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl shadow-md border border-gray-100">
                                <div className="p-4 border-b border-gray-200">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex items-center">
                                            <Package className="h-5 w-5 text-[#ff1a1a] mr-2" />
                                            <h2 className="text-lg font-semibold text-gray-900">Display Products</h2>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-gray-500">Sales:</span>
                                                <span className="font-bold text-[#00c951]">₱{(stats?.daily_sales || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-gray-500">Trans:</span>
                                                <span className="font-bold text-blue-600">{stats?.transactions_today || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-gray-500">Cart:</span>
                                                <span className="font-bold text-orange-600">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-3 mt-3">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Search className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-12 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                                placeholder="Search products by name or scan barcode..."
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                            >
                                                <option value="All">All Categories</option>
                                                {Array.isArray(categories) && categories.map(category => (
                                                    <option key={category.id} value={category.id}>{category.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4">
                                    {loading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff1a1a]"></div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                           {Array.isArray(products) && products.map((product) => (
                                            <div 
                                                key={product.id} 
                                                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group relative"
                                                onClick={() => addToCart(product)}
                                            >  
                                                <div className="flex items-center justify-between mb-2">
                                                    <div 
                                                        className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#ff1a1a] transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (product.images && product.images.length > 0) {
                                                                setViewingImage({ src: product.images[0], name: product.name });
                                                            }
                                                        }}
                                                    >
                                                        {product.images && product.images.length > 0 ? (
                                                            <img 
                                                                src={product.images[0]} 
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-[#ff1a1a] flex items-center justify-center">
                                                                <Package className="h-5 w-5 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                                                        {product.stock_quantity} {product.unit}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-gray-900 text-sm mb-1">{product.name}</h3>
                                                <p className="text-xs text-gray-500">{product.category?.name || 'No Category'}</p>
                                                <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-bold text-[#ff1a1a]">
                                                        ₱{ensureNumber(product.price).toFixed(2)}
                                                    </span>
                                                    <button 
                                                        className="w-6 h-6 bg-[#ff1a1a] text-white rounded-full flex items-center justify-center hover:bg-[#ff3333] transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(product);
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    )}

                                    {!loading && (!Array.isArray(products) || products.length === 0) && (
                                        <div className="text-center py-8">
                                            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">No products found matching your search criteria.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 lg:sticky lg:top-4">
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-4 flex justify-between items-center">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3">
                                            <ShoppingCart className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Current Sale</h2>
                                            <p className="text-white/80 text-xs">
                                                {cart.length > 0 ? `${cart.length} item${cart.length !== 1 ? 's' : ''} in cart` : 'No items added'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDiscountOptions(true)}
                                        className="inline-flex items-center px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all text-xs font-medium border border-white/30"
                                    >
                                        <Percent className="h-3 w-3 mr-1.5" />
                                        Discounts
                                    </button>
                                </div>

                                <div className="p-4">
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer Name</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]/20 focus:border-[#ff1a1a] transition-all text-sm bg-gray-50/50"
                                            placeholder="Enter customer name (optional)"
                                        />
                                    </div>

                                    {(isSeniorCitizen || isPWD || generalDiscountRate > 0) && (
                                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Percent className="h-4 w-4 text-green-600 mr-2" />
                                                    <span className="text-sm font-medium text-green-800">
                                                        {isSeniorCitizen && `Senior Citizen Discount (${seniorDiscountRate}%)`}
                                                        {isPWD && `PWD Discount (${pwdDiscountRate}%)`}
                                                        {generalDiscountRate > 0 && `General Discount (${generalDiscountRate}%)`}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={resetDiscounts}
                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-1">
                                        {!Array.isArray(cart) || cart.length === 0 ? (
                                            <div className="text-center py-8 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <p className="text-gray-600 font-medium text-sm">Your cart is empty</p>
                                                <p className="text-gray-400 text-xs mt-1">Click on products to add them</p>
                                            </div>
                                        ) : (
                                            Array.isArray(cart) && cart.map((item) => item && (
                                                <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name || 'Unknown Item'}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500">₱{ensureNumber(item.price).toFixed(2)} each</span>
                                                            <span className="text-[10px] text-gray-400">•</span>
                                                            <span className="text-[10px] text-gray-400">Stock: {item.stock_quantity}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, Math.max(0, (item.quantity || 0) - 1))}
                                                            className="w-6 h-6 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={item.stock_quantity}
                                                            value={item.quantity || ""}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "") {
                                                                    setCart((prevCart) => prevCart.map((cartItem) => (cartItem?.id === item.id ? { ...cartItem, quantity: 0 } : cartItem)));
                                                                    return;
                                                                }
                                                                const newQuantity = parseInt(value);
                                                                if (isNaN(newQuantity) || newQuantity < 0) {
                                                                    return;
                                                                }
                                                                if (newQuantity > item.stock_quantity) {
                                                                    showNotification("error", `Only ${item.stock_quantity} ${item.unit} available in stock`);
                                                                    return;
                                                                }
                                                                updateQuantity(item.id, newQuantity);
                                                            }}
                                                            onBlur={(e) => {
                                                                const newQuantity = parseInt(e.target.value) || 0;
                                                                if (newQuantity <= 0) {
                                                                    removeFromCart(item.id);
                                                                }
                                                            }}
                                                            onFocus={(e) => e.target.select()}
                                                            className="w-10 h-6 text-center text-xs font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]/20 focus:border-[#ff1a1a]"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newQuantity = (item.quantity || 0) + 1;
                                                                if (newQuantity > item.stock_quantity) {
                                                                    showNotification('error', `Only ${item.stock_quantity} ${item.unit} available in stock`);
                                                                    return;
                                                                }
                                                                updateQuantity(item.id, newQuantity);
                                                            }}
                                                            className="w-6 h-6 bg-[#ff1a1a]/10 text-[#ff1a1a] rounded-lg flex items-center justify-center hover:bg-[#ff1a1a] hover:text-white transition-all"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>

                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="w-6 h-6 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {Array.isArray(cart) && cart.length > 0 && (
                                        <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Subtotal</span>
                                                    <span className="font-medium">₱{calculateSubtotal().toFixed(2)}</span>
                                                </div>

                                                {calculateDiscount().amount > 0 && (
                                                    <div className="flex justify-between text-sm text-green-600">
                                                        <span className="flex items-center">
                                                            <Percent className="h-3 w-3 mr-1" />
                                                            Discount ({(calculateDiscount().rate * 100).toFixed(0)}%)
                                                        </span>
                                                        <span className="font-medium">-₱{calculateDiscount().amount.toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>VAT (12%)</span>
                                                    <span className="font-medium">₱{calculateVAT().toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                                                    <span className="text-gray-900">Total</span>
                                                    <span className="text-[#ff1a1a]">₱{calculateTotal().toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(cart) && cart.length > 0 && (
                                        <div className="mb-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cash Amount</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-sm font-medium">₱</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={cashAmount}
                                                        onChange={(e) => setCashAmount(e.target.value)}
                                                        className="pl-7 w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]/20 focus:border-[#ff1a1a] transition-all text-sm bg-gray-50/50"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                {cashAmount && parseFloat(cashAmount) >= calculateTotal() && (
                                                    <div className="mt-2 flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                                                        <span className="text-xs text-green-700 font-medium">Change</span>
                                                        <span className="text-sm font-bold text-green-700">₱{calculateChange().toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-4 gap-2 mt-3">
                                                    {[50, 100, 200, 500].map(amount => (
                                                        <button
                                                            key={amount}
                                                            onClick={() => setCashAmount(amount.toString())}
                                                            className="px-2 py-2 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-xl hover:border-[#ff1a1a] hover:text-[#ff1a1a] transition-all shadow-sm"
                                                        >
                                                            ₱{amount}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => setCashAmount(calculateTotal().toFixed(2))}
                                                    className="w-full mt-2 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                                                >
                                                    Exact Amount (₱{calculateTotal().toFixed(2)})
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(cart) && cart.length > 0 && (
                                        <div className="space-y-2.5">
                                            <button
                                                onClick={processTransaction}
                                                disabled={processing || (paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < calculateTotal()))}
                                                className="w-full px-4 py-3.5 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-xl hover:from-[#ff3333] hover:to-[#ff4444] transition-all font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                                            >
                                                {processing ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        Complete Sale
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={clearCart}
                                                className="w-full px-3 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-medium flex items-center justify-center text-sm"
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Clear Cart
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                <button 
                                    onClick={() => setShowRecentTransactions(!showRecentTransactions)}
                                    className="w-full p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center">
                                        <Receipt className="h-4 w-4 text-gray-500 mr-2" />
                                        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                            {recentTransactions.length}
                                        </span>
                                    </div>
                                    <div className={`transform transition-transform duration-200 ${showRecentTransactions ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showRecentTransactions ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-4">
                                        {recentTransactions.length === 0 ? (
                                            <div className="text-center py-6">
                                                <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">No recent transactions</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                {recentTransactions.map((transaction, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center">
                                                            <div className="w-6 h-6 bg-[#ff1a1a] rounded-lg flex items-center justify-center mr-2">
                                                                <Receipt className="h-3 w-3 text-white" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {transaction.customer_name || 'Walk-in Customer'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {transaction.items.length} items • {transaction.payment_method}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                ₱{transaction.total.toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(transaction.created_at!).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DiscountModal />
            <ReceiptModal />
            <Notification />

            {/* Image View Modal */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div 
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
                            onClick={() => setViewingImage(null)}
                        ></div>
                        
                        <div className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-w-lg w-full">
                            <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white truncate pr-4">
                                    {viewingImage.name}
                                </h3>
                                <button
                                    onClick={() => setViewingImage(null)}
                                    className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors flex-shrink-0"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="p-4 flex items-center justify-center bg-gray-50">
                                <img 
                                    src={viewingImage.src} 
                                    alt={viewingImage.name}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                                />
                            </div>
                            
                            <div className="p-4 bg-white border-t">
                                <p className="text-sm text-gray-600 text-center">
                                    Click outside or press the X button to close
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}