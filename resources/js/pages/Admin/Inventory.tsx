import AppLayout from '@/layouts/app-layout';
import { 
    Package, Search, PlusCircle, RefreshCw, Download, Edit, Trash2, Filter, X, Eye, 
    AlertTriangle, Calendar, DollarSign, TrendingUp, TrendingDown, Minus, Upload,
    BarChart3, ChevronLeft, ChevronRight, Loader2, FileText, AlertCircle, CheckCircle,
    XCircle, Clock, Tag, Truck, Users, Activity, Hash, Shield, ExternalLink,
    FileUp, Check, User, ShoppingCart 
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { 
    inventoryService, 
    InventoryItem, 
    InventoryFormData, 
    InventoryStats, 
    PaginationData, 
    StockAdjustmentData,
    ReferenceNumberData,
    DeletionCheckData,
    ValidationError
} from '../../../services/inventoryServices';
import { categoryService, Category } from '../../../services/categoryServices';
import { supplierService, Supplier } from '../../../services/supplierServices';

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'active': "bg-gradient-to-r from-[#00c951] to-[#00a642] text-white shadow-lg",
        'inactive': "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg",
        'discontinued': "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
    };
    
    return (
        <span className={`${styles[status]} text-xs font-semibold px-3 py-1.5 rounded-full capitalize`}>
            {status}
        </span>
    );
};

const formatPrice = (price: number | string | undefined): string => {
    if (price === undefined || price === null) return '0.00';
    const numPrice = typeof price === 'number' ? price : parseFloat(price.toString());
    if (isNaN(numPrice)) return '0.00';
    
    return numPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity === 0) {
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            Out of Stock
        </span>;
    } else if (item.stock_quantity <= item.minimum_stock) {
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low Stock
        </span>;
    } else {
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            In Stock
        </span>;
    }
};

const StatsCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color,
    trend,
    trendValue
}: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: any;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                    {trendValue && (
                        <div className="flex items-center mt-1">
                            {getTrendIcon()}
                            <span className={`text-xs ml-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                                {trendValue}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`${color} p-2 rounded-lg shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
        </div>
    );
};

const ErrorAlert = ({ errors }: { errors: ValidationError[] }) => {
    if (!errors || errors.length === 0) return null;

    return (
        <div className="mb-4 p-4 border border-red-200 rounded-xl bg-red-50">
            <div className="flex items-center mb-2">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <h4 className="text-red-800 font-semibold">Please fix the following errors:</h4>
            </div>
            <ul className="space-y-1">
                {errors.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{error.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const InventoryModal = ({ 
    isOpen, 
    onClose, 
    item, 
    onSave,
    categories,
    suppliers,
    loading,
    allItems
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    item?: InventoryItem | null; 
    onSave: (itemData: InventoryFormData) => void;
    categories: Category[];
    suppliers: Supplier[];
    loading?: boolean;
    allItems: InventoryItem[];
}) => {
    const [formData, setFormData] = useState<InventoryFormData>({
        sku: '',
        name: '',
        description: '',
        category_id: 0,
        supplier_id: 0,
        price: 0,
        cost: 0,
        stock_quantity: 0,
        minimum_stock: 0,
        maximum_stock: 0,
        unit: '',
        status: 'active',
        expiry_date: '',
        batch_number: '',
        barcode: '',
        images: [],
        auto_generate_barcode: true,
        barcode_prefix: 'MED'
    });
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [formLoading, setFormLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const [skuSearchQuery, setSkuSearchQuery] = useState('');
    const [showSkuDropdown, setShowSkuDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const skuInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error parsing date:', dateString, error);
            return '';
        }
    };

    useEffect(() => {
        if (item) {
            setFormData({
                sku: item.sku || '',
                name: item.name || '',
                description: item.description || '',
                category_id: item.category_id || 0,
                supplier_id: item.supplier_id || 0,
                price: item.price || 0,
                cost: item.cost || 0,
                stock_quantity: item.stock_quantity || 0,
                minimum_stock: item.minimum_stock || 0,
                maximum_stock: item.maximum_stock || 0,
                unit: item.unit || '',
                status: item.status || 'active',
                expiry_date: formatDateForInput(item.expiry_date),
                batch_number: item.batch_number || '',
                barcode: item.barcode || '',
                images: item.images || [],
                auto_generate_barcode: !item.barcode,
                barcode_prefix: 'MED'
            });
            setImagePreview(item.images && item.images.length > 0 ? item.images[0] : null);
            setSkuSearchQuery('');
        } else {
            setFormData({
                sku: '',
                name: '',
                description: '',
                category_id: 0,
                supplier_id: 0,
                price: 0,
                cost: 0,
                stock_quantity: 0,
                minimum_stock: 0,
                maximum_stock: 0,
                unit: '',
                status: 'active',
                expiry_date: '',
                batch_number: '',
                barcode: '',
                images: [],
                auto_generate_barcode: true,
                barcode_prefix: 'MED'
            });
            setImagePreview(null);
            setSkuSearchQuery('');
        }
        setErrors([]);
        setShowSkuDropdown(false);
    }, [item, isOpen]);

    useEffect(() => {
        if (skuSearchQuery.trim() === '') {
            setFilteredItems([]);
            setShowSkuDropdown(false);
            return;
        }

        const query = skuSearchQuery.toLowerCase();
        const filtered = allItems.filter(item => 
            item.name.toLowerCase().includes(query) ||
            item.sku.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
        ).slice(0, 10);

        setFilteredItems(filtered);
        setShowSkuDropdown(filtered.length > 0);
    }, [skuSearchQuery, allItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                skuInputRef.current && !skuInputRef.current.contains(event.target as Node)) {
                setShowSkuDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSkuSearchChange = (value: string) => {
        setSkuSearchQuery(value);
        if (formData.sku && value !== '') {
            setFormData({ ...formData, sku: '' });
        }
    };

    const handleSelectItem = (selectedItem: InventoryItem) => {
        setFormData({
            ...formData,
            sku: selectedItem.sku
        });
        setSkuSearchQuery('');
        setShowSkuDropdown(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrors([{
                    type: 'validation_error',
                    message: 'Image size should be less than 5MB',
                    severity: 'medium'
                }]);
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                setFormData({ ...formData, images: [base64String] });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setFormData({ ...formData, images: [] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);
        setFormLoading(true);
        
        try {
            await onSave(formData);
        } catch (error: any) {
            if (error.response?.detailed_errors) {
                setErrors(error.response.detailed_errors);
            } else {
                setErrors([{
                    type: 'system_error',
                    message: error.message || 'An unexpected error occurred',
                    severity: 'high'
                }]);
            }
        } finally {
            setFormLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-[#000080] to-[#000080] px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {item ? 'Edit Inventory Item' : 'Add New Item'}
                            </h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                disabled={formLoading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <ErrorAlert errors={errors} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    SKU <span className="text-red-500">*</span>
                                </label>
                                
                                <div className="relative">
                                    <div className="relative">
                                        <input
                                            ref={skuInputRef}
                                            type="text"
                                            className={`w-full px-4 py-3 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                                errors.some(e => e.message.toLowerCase().includes('sku')) 
                                                    ? 'border-red-300 bg-red-50' 
                                                    : 'border-gray-200'
                                            }`}
                                            value={skuSearchQuery}
                                            onChange={(e) => handleSkuSearchChange(e.target.value)}
                                            onFocus={() => skuSearchQuery && setShowSkuDropdown(filteredItems.length > 0)}
                                            placeholder="Type product name to search..."
                                            disabled={formLoading}
                                        />
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    </div>

                                    {showSkuDropdown && (
                                        <div 
                                            ref={dropdownRef}
                                            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                                        >
                                            {filteredItems.map((filteredItem) => (
                                                <button
                                                    key={filteredItem.id}
                                                    type="button"
                                                    onClick={() => handleSelectItem(filteredItem)}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-900">{filteredItem.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                SKU: <span className="font-mono">{filteredItem.sku}</span>
                                                            </div>
                                                            {filteredItem.description && (
                                                                <div className="text-xs text-gray-400 mt-1 truncate">
                                                                    {filteredItem.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4 text-right">
                                                            <div className="text-sm font-semibold text-[#00c951]">
                                                                ₱{formatPrice(filteredItem.price)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Stock: {filteredItem.stock_quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-xs font-medium text-gray-600">SKU Code (Editable)</label>
                                        {formData.sku && (
                                            <span className="text-xs text-green-600 flex items-center">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                From search
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 pl-10 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all font-mono ${
                                                formData.sku 
                                                    ? 'border-green-300 bg-green-50' 
                                                    : errors.some(e => e.message.toLowerCase().includes('sku'))
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                            value={formData.sku}
                                            onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                            placeholder="e.g., MED-001 (customize if needed)"
                                            required
                                            disabled={formLoading}
                                        />
                                        <Hash className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                                            formData.sku ? 'text-green-600' : 'text-gray-400'
                                        }`} />
                                        {formData.sku && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, sku: ''})}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                disabled={formLoading}
                                                title="Clear SKU"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Search for a product above to auto-fill, or type your custom SKU code
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                        errors.some(e => e.message.toLowerCase().includes('name')) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Product name"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <textarea
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Product description"
                                    rows={3}
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                        errors.some(e => e.message.toLowerCase().includes('category')) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
                                    required
                                    disabled={formLoading}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                        errors.some(e => e.message.toLowerCase().includes('supplier')) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    value={formData.supplier_id}
                                    onChange={(e) => setFormData({...formData, supplier_id: parseInt(e.target.value)})}
                                    required
                                    disabled={formLoading}
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Price <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                        errors.some(e => e.message.toLowerCase().includes('price')) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    value={formData.price || ''}
                                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Cost</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.cost || ''}
                                    onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Stock Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all ${
                                        errors.some(e => e.message.toLowerCase().includes('stock')) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    }`}
                                    value={formData.stock_quantity || ''}
                                    onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 0})}
                                    placeholder="0"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Minimum Stock <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.minimum_stock || ''}
                                    onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
                                    placeholder="0"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Maximum Stock</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.maximum_stock || ''}
                                    onChange={(e) => setFormData({...formData, maximum_stock: parseInt(e.target.value) || 0})}
                                    placeholder="0"
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Unit <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                    placeholder="e.g., pcs, box, bottle"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <select
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive' | 'discontinued'})}
                                    disabled={formLoading}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="discontinued">Discontinued</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.expiry_date}
                                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                                    disabled={formLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Number</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c951] focus:border-transparent transition-all"
                                    value={formData.batch_number}
                                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                                    placeholder="Batch number"
                                    disabled={formLoading}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image (Optional)</label>
                                <div className="flex items-start gap-4">
                                    {imagePreview ? (
                                        <div className="relative">
                                            <img 
                                                src={imagePreview} 
                                                alt="Product preview" 
                                                className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                disabled={formLoading}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00c951] hover:bg-green-50 transition-all"
                                        >
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-500 text-center">Click to upload</span>
                                            <span className="text-xs text-gray-400">Max 5MB</span>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={formLoading}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Upload a product image to help identify the item. Supported formats: JPG, PNG, GIF.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                            disabled={formLoading || !!imagePreview}
                                        >
                                            {imagePreview ? 'Image Uploaded' : 'Choose File'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-gradient-to-r from-[#00c951] to-[#00a642] text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center"
                                disabled={formLoading || !formData.sku}
                            >
                                {formLoading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        {item ? 'Update Item' : 'Add Item'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const StockAdjustmentModal = ({ 
    isOpen, 
    onClose, 
    item, 
    onSave,
    loading 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    item?: InventoryItem | null;
    onSave: (data: StockAdjustmentData) => void;
    loading?: boolean;
}) => {
    const [adjustmentData, setAdjustmentData] = useState<StockAdjustmentData>({
        type: 'in',
        quantity: 0,
        reason: '',
        notes: '',
        reference_number: inventoryService.generateReferenceNumber('ADJ')
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAdjustmentData({
                type: 'in',
                quantity: 0,
                reason: '',
                notes: '',
                reference_number: inventoryService.generateReferenceNumber('ADJ')
            });
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        
        try {
            await onSave(adjustmentData);
            onClose();
        } catch (error) {
            console.error('Stock adjustment error:', error);
        } finally {
            setFormLoading(false);
        }
    };

    if (!isOpen || !item) return null;

    const newStock = adjustmentData.type === 'in' 
        ? item.stock_quantity + adjustmentData.quantity
        : adjustmentData.type === 'out'
        ? item.stock_quantity - adjustmentData.quantity
        : adjustmentData.quantity;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <TrendingUp className="h-6 w-6 mr-2" />
                                Adjust Stock
                            </h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                disabled={formLoading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Current Stock</p>
                                    <p className="text-2xl font-bold text-gray-900">{item.stock_quantity} {item.unit}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Adjustment Type <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentData({...adjustmentData, type: 'in'})}
                                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                        adjustmentData.type === 'in'
                                            ? 'bg-green-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    disabled={formLoading}
                                >
                                    <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                                    Stock In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentData({...adjustmentData, type: 'out'})}
                                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                        adjustmentData.type === 'out'
                                            ? 'bg-red-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    disabled={formLoading}
                                >
                                    <TrendingDown className="h-5 w-5 mx-auto mb-1" />
                                    Stock Out
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentData({...adjustmentData, type: 'adjustment'})}
                                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                        adjustmentData.type === 'adjustment'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    disabled={formLoading}
                                >
                                    <RefreshCw className="h-5 w-5 mx-auto mb-1" />
                                    Adjustment
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reference Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={adjustmentData.reference_number}
                                onChange={(e) => setAdjustmentData({...adjustmentData, reference_number: e.target.value})}
                                placeholder="Enter reference number"
                                required
                                disabled={formLoading}
                            />
                            <p className="mt-1 text-xs text-gray-500">Auto-generated reference number (can be edited)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={adjustmentData.quantity || ''}
                                onChange={(e) => setAdjustmentData({...adjustmentData, quantity: parseInt(e.target.value) || 0})}
                                placeholder="Enter quantity"
                                required
                                disabled={formLoading}
                            />
                            
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">New Stock Level:</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {newStock} {item.unit}
                                        {newStock <= item.minimum_stock && (
                                            <AlertTriangle className="inline h-4 w-4 ml-2 text-yellow-600" />
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={adjustmentData.reason}
                                onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                                placeholder="Enter reason for adjustment"
                                required
                                disabled={formLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                            <textarea
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={adjustmentData.notes}
                                onChange={(e) => setAdjustmentData({...adjustmentData, notes: e.target.value})}
                                placeholder="Additional notes..."
                                rows={3}
                                disabled={formLoading}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center"
                                disabled={formLoading || adjustmentData.quantity <= 0}
                            >
                                {formLoading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        Confirm Adjustment
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const DeleteModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    item,
    loading 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void;
    item?: InventoryItem | null;
    loading?: boolean;
}) => {
    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <AlertTriangle className="h-6 w-6 mr-2" />
                                Confirm Delete
                            </h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                disabled={loading}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to delete this item? This action cannot be undone.
                            </p>
                            
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="font-semibold text-gray-900">{item.name}</div>
                                <div className="text-sm text-gray-500 mt-1">SKU: {item.sku}</div>
                                <div className="text-sm text-gray-500">Stock: {item.stock_quantity} {item.unit}</div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-5 w-5 mr-2" />
                                        Delete Item
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CSVImportData {
    sku: string;
    name: string;
    description?: string;
    category_name?: string;
    supplier_name?: string;
    price: number;
    cost?: number;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    unit: string;
    status?: string;
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
}

interface CSVValidationError {
    row: number;
    field: string;
    message: string;
}

const CSVImportModal = ({ 
    isOpen, 
    onClose, 
    onImport,
    categories,
    suppliers
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onImport: (data: CSVImportData[]) => Promise<void>;
    categories: Category[];
    suppliers: Supplier[];
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<CSVImportData[]>([]);
    const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);
    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 });
    const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({
        success: 0,
        failed: 0,
        errors: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setCsvData([]);
            setValidationErrors([]);
            setImporting(false);
            setStep('upload');
            setImportProgress({ current: 0, total: 0, errors: 0 });
            setImportResults({ success: 0, failed: 0, errors: [] });
        }
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setValidationErrors([{ row: 0, field: 'file', message: 'Please upload a CSV file' }]);
            return;
        }

        setFile(selectedFile);
        await parseCSV(selectedFile);
    };

    const parseCSV = async (file: File) => {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            setValidationErrors([{ row: 0, field: 'file', message: 'CSV file is empty or has no data rows' }]);
            return;
        }

        // Enhanced CSV parsing to handle quoted fields
        const parseCSVRow = (row: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < row.length) {
                const char = row[i];
                const nextChar = i < row.length - 1 ? row[i + 1] : '';
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote inside quoted field
                        current += '"';
                        i += 2; // Skip both quotes
                        continue;
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                        i++;
                        continue;
                    }
                }
                
                if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                    i++;
                    continue;
                }
                
                current += char;
                i++;
            }
            
            // Add the last field
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
        const requiredHeaders = ['sku', 'name', 'price', 'stock_quantity', 'minimum_stock', 'unit'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            setValidationErrors([{ 
                row: 0, 
                field: 'headers', 
                message: `Missing required columns: ${missingHeaders.join(', ')}` 
            }]);
            return;
        }

        const data: CSVImportData[] = [];
        const errors: CSVValidationError[] = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty rows
            
            const values = parseCSVRow(lines[i]);
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            if (!row.sku) errors.push({ row: i + 1, field: 'sku', message: 'SKU is required' });
            if (!row.name) errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
            if (!row.price || isNaN(parseFloat(row.price))) {
                errors.push({ row: i + 1, field: 'price', message: 'Valid price is required' });
            }
            if (!row.stock_quantity || isNaN(parseInt(row.stock_quantity))) {
                errors.push({ row: i + 1, field: 'stock_quantity', message: 'Valid stock quantity is required' });
            }
            if (!row.minimum_stock || isNaN(parseInt(row.minimum_stock))) {
                errors.push({ row: i + 1, field: 'minimum_stock', message: 'Valid minimum stock is required' });
            }
            if (!row.unit) errors.push({ row: i + 1, field: 'unit', message: 'Unit is required' });

            const importData: CSVImportData = {
                sku: row.sku,
                name: row.name,
                description: row.description || '',
                category_name: row.category_name || row.category || '',
                supplier_name: row.supplier_name || row.supplier || '',
                price: parseFloat(row.price) || 0,
                cost: row.cost ? parseFloat(row.cost) : 0,
                stock_quantity: parseInt(row.stock_quantity) || 0,
                minimum_stock: parseInt(row.minimum_stock) || 0,
                maximum_stock: row.maximum_stock ? parseInt(row.maximum_stock) : 0,
                unit: row.unit,
                status: row.status || 'active',
                expiry_date: row.expiry_date || '',
                batch_number: row.batch_number || '',
                barcode: row.barcode || ''
            };

            data.push(importData);
        }

        setCsvData(data);
        setValidationErrors(errors);

        if (errors.length === 0) {
            setStep('preview');
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setStep('importing');
        setImportProgress({ current: 0, total: csvData.length, errors: 0 });
        
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < csvData.length; i += batchSize) {
            batches.push(csvData.slice(i, i + batchSize));
        }

        try {
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                
                await Promise.all(batch.map(async (item, itemIndex) => {
                    const currentIndex = batchIndex * batchSize + itemIndex;
                    
                    try {
                        let categoryId = 0;
                        if (item.category_name) {
                            const existingCategory = categories.find(
                                c => c.name.toLowerCase() === item.category_name?.toLowerCase()
                            );
                            if (existingCategory) {
                                categoryId = existingCategory.id;
                            } else {
                                const newCategory = await categoryService.createCategory({
                                    name: item.category_name,
                                    description: '',
                                    status: 'active'
                                });
                                if (newCategory.success && newCategory.data) {
                                    categoryId = newCategory.data.id;
                                    categories.push(newCategory.data);
                                }
                            }
                        }

                        let supplierId = 0;
                        if (item.supplier_name) {
                            const existingSupplier = suppliers.find(
                                s => s.name.toLowerCase() === item.supplier_name?.toLowerCase()
                            );
                            if (existingSupplier) {
                                supplierId = existingSupplier.id;
                            } else {
                                const newSupplier = await supplierService.createSupplier({
                                    name: item.supplier_name,
                                    status: 'active'
                                });
                                if (newSupplier.success && newSupplier.data) {
                                    supplierId = newSupplier.data.id;
                                    suppliers.push(newSupplier.data);
                                }
                            }
                        }

                        const inventoryData: InventoryFormData = {
                            sku: item.sku,
                            name: item.name,
                            description: item.description || '',
                            category_id: categoryId,
                            supplier_id: supplierId,
                            price: item.price,
                            cost: item.cost || 0,
                            stock_quantity: item.stock_quantity,
                            minimum_stock: item.minimum_stock,
                            maximum_stock: item.maximum_stock || 0,
                            unit: item.unit,
                            status: (item.status as 'active' | 'inactive' | 'discontinued') || 'active',
                            expiry_date: item.expiry_date || '',
                            batch_number: item.batch_number || '',
                            barcode: item.barcode || '',
                            auto_generate_barcode: !item.barcode,
                            barcode_prefix: 'MED'
                        };

                        try {
                            await inventoryService.createItem(inventoryData);
                            results.success++;
                        } catch (error: any) {
                            results.failed++;
                            let errorMsg = 'Row ' + (currentIndex + 2) + ' (SKU: ' + item.sku + '): ' + (error.message || 'Unknown error');
                            
                            // Check for duplicate SKU error
                            if (error.message && error.message.toLowerCase().includes('duplicate') || 
                                error.message && error.message.toLowerCase().includes('already exists') ||
                                error.message && error.message.toLowerCase().includes('unique')) {
                                errorMsg += ' [DUPLICATE SKU - This item may already exist]';
                            }
                            
                            results.errors.push(errorMsg);
                            setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
                        }
                    } catch (error: any) {
                        results.failed++;
                        const errorMsg = 'Row ' + (currentIndex + 2) + ' (SKU: ' + item.sku + '): Processing error - ' + (error.message || 'Unknown error');
                        results.errors.push(errorMsg);
                        setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
                    }
                    
                    setImportProgress(prev => ({ 
                        ...prev, 
                        current: Math.min(prev.current + 1, csvData.length)
                    }));
                }));
            }

            setImportResults(results);

            // Enhanced completion logic for better user feedback
            if (results.success > 0) {
                let completionMessage = `Import completed! ${results.success} items imported successfully`;
                if (results.failed > 0) {
                    completionMessage += `, ${results.failed} failed`;
                }
                
                // Auto-close modal after 3 seconds for successful imports
                setTimeout(() => {
                    onClose();
                    // Show final notification in parent component
                    console.log('🎉 CSV Import Summary:', {
                        successful: results.success,
                        failed: results.failed,
                        total: csvData.length,
                        errors: results.errors.length
                    });
                }, 3000);
            } else {
                // Don't auto-close if all imports failed
                console.warn('⚠️ All import items failed:', results.errors);
            }

        } catch (error: any) {
            results.errors.push('System error: ' + (error.message || 'Failed to import CSV'));
            setImportResults(results);
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 
`sku,name,description,category_name,supplier_name,price,cost,stock_quantity,minimum_stock,maximum_stock,unit,status,expiry_date,batch_number,barcode
MED-001,Paracetamol 500mg,Pain reliever and fever reducer,Medicine,ABC Pharma,5.50,3.00,100,20,500,tablet,active,2025-12-31,BATCH001,
MED-002,Ibuprofen 200mg,Anti-inflammatory,Medicine,XYZ Supplies,8.75,5.00,75,15,300,tablet,active,2025-11-30,BATCH002,
MED-003,Amoxicillin 250mg,Antibiotic,Medicine,ABC Pharma,12.00,8.00,50,10,200,capsule,active,2025-10-31,BATCH003,
MED-004,Cetirizine 10mg,Antihistamine,Medicine,XYZ Supplies,3.50,2.00,200,30,600,tablet,active,2026-01-31,BATCH004,
MED-005,Vitamin C 500mg,Supplement,Vitamins,Health Plus,6.00,4.00,150,25,500,tablet,active,2026-06-30,BATCH005,`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => !importing && onClose()}></div>
                
                <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <FileUp className="h-6 w-6 mr-2" />
                                Bulk Import Inventory from CSV
                            </h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                disabled={importing}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {step === 'upload' ? (
                            <>
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                                        <AlertCircle className="h-5 w-5 mr-2" />
                                        CSV Format Instructions
                                    </h3>
                                    <ul className="text-sm text-blue-800 space-y-1 ml-7">
                                        <li>• First row must contain column headers (case-insensitive)</li>
                                        <li>• <strong>Required columns:</strong> sku, name, price, stock_quantity, minimum_stock, unit</li>
                                        <li>• <strong>Optional columns:</strong> description, category_name, supplier_name, cost, maximum_stock, status, expiry_date, batch_number, barcode</li>
                                        <li>• Date format: YYYY-MM-DD (e.g., 2025-12-31)</li>
                                        <li>• Status values: active, inactive, discontinued (default: active)</li>
                                        <li>• Non-existent categories and suppliers will be created automatically</li>
                                        <li>• Items are processed in batches of 10 for optimal performance</li>
                                    </ul>
                                </div>

                                <div className="mb-6">
                                    <button
                                        onClick={downloadTemplate}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center text-gray-700 hover:text-purple-700"
                                    >
                                        <Download className="h-5 w-5 mr-2" />
                                        Download CSV Template with Sample Data
                                    </button>
                                </div>

                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
                                >
                                    <FileUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                    <p className="text-lg font-semibold text-gray-700 mb-2">
                                        {file ? file.name : 'Click to upload CSV file'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        or drag and drop your CSV file here
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>

                                {validationErrors.length > 0 && (
                                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                                            <XCircle className="h-5 w-5 mr-2" />
                                            Validation Errors ({validationErrors.length})
                                        </h3>
                                        <div className="max-h-40 overflow-y-auto">
                                            <ul className="text-sm text-red-800 space-y-1">
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>
                                                        Row {error.row}: {error.field} - {error.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : step === 'preview' ? (
                            <>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 flex items-center">
                                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                            Preview ({csvData.length} items ready to import)
                                        </h3>
                                        <button
                                            onClick={() => setStep('upload')}
                                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                        >
                                            ← Back to Upload
                                        </button>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">SKU</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Price</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Stock</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Unit</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Category</th>
                                                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Supplier</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {csvData.slice(0, 100).map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                                                            <td className="px-4 py-2">{item.name}</td>
                                                            <td className="px-4 py-2">₱{formatPrice(item.price)}</td>
                                                            <td className="px-4 py-2">{item.stock_quantity}</td>
                                                            <td className="px-4 py-2">{item.unit}</td>
                                                            <td className="px-4 py-2">{item.category_name || '-'}</td>
                                                            <td className="px-4 py-2">{item.supplier_name || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {csvData.length > 100 && (
                                                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                                                    ... and {csvData.length - 100} more items
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <p className="text-sm text-yellow-800 flex items-start">
                                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Important:</strong> This will create <strong>{csvData.length}</strong> new inventory items. 
                                            Items with duplicate SKUs will be skipped. Categories and suppliers will be created automatically if they don't exist.
                                        </span>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 flex items-center">
                                            <Loader2 className="h-5 w-5 text-purple-600 mr-2 animate-spin" />
                                            Importing Items...
                                        </h3>
                                        <span className="text-sm text-gray-600">
                                            {importProgress.current} of {importProgress.total}
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                                        <div 
                                            className="bg-gradient-to-r from-purple-600 to-purple-700 h-4 rounded-full transition-all duration-300"
                                            style={{ width: (importProgress.current / importProgress.total) * 100 + '%' }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                                            <div className="text-xs text-green-700">Successful</div>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                                            <div className="text-xs text-red-700">Failed</div>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-blue-600">{importProgress.total - importProgress.current}</div>
                                            <div className="text-xs text-blue-700">Remaining</div>
                                        </div>
                                    </div>

                                    {importResults.errors.length > 0 && (
                                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl max-h-60 overflow-y-auto">
                                            <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                                                <AlertCircle className="h-5 w-5 mr-2" />
                                                Import Errors ({importResults.errors.length})
                                            </h4>
                                            <ul className="text-sm text-red-800 space-y-1">
                                                {importResults.errors.map((error, index) => (
                                                    <li key={index} className="flex items-start">
                                                        <span className="text-red-500 mr-2">•</span>
                                                        <span>{error}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {!importing && importProgress.current === importProgress.total && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                            <p className="text-sm text-green-800 flex items-center">
                                                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                                                <span>
                                                    Import completed! <strong>{importResults.success}</strong> items imported successfully
                                                    {importResults.failed > 0 && (', ' + importResults.failed + ' failed')}.
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                disabled={importing}
                            >
                                {step === 'importing' && importProgress.current === importProgress.total ? 'Close' : 'Cancel'}
                            </button>
                            {step === 'preview' && (
                                <button
                                    onClick={handleImport}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center"
                                    disabled={importing || csvData.length === 0}
                                >
                                    <Upload className="h-5 w-5 mr-2" />
                                    Import {csvData.length} Items
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Notification = ({ 
    type, 
    message, 
    onClose 
}: { 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string; 
    onClose: () => void;
}) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-green-50 border-green-500',
        error: 'bg-red-50 border-red-500',
        warning: 'bg-yellow-50 border-yellow-500',
        info: 'bg-blue-50 border-blue-500'
    };

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-green-600" />,
        error: <XCircle className="h-5 w-5 text-red-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
        info: <AlertCircle className="h-5 w-5 text-blue-600" />
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className={`${bgColors[type]} border-l-4 rounded-xl shadow-xl p-4 min-w-[300px] max-w-md`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {icons[type]}
                        <p className="text-sm font-medium text-gray-900">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]); // For Quotation modal
    const [stats, setStats] = useState<InventoryStats | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showOutOfStockView, setShowOutOfStockView] = useState(false);
    const [outOfStockItems, setOutOfStockItems] = useState<InventoryItem[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0
    });
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning' | 'info', message: string} | null>(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCSVImportModal, setShowCSVImportModal] = useState(false);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [quotationCustomerName, setQuotationCustomerName] = useState('');
    const [quotationItems, setQuotationItems] = useState<{item: InventoryItem | null, quantity: string}[]>([]);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const handleExportPDF = () => {
        try {
            generateInventoryPDF();
            setNotification({ type: 'success', message: 'Inventory report exported successfully' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Failed to export inventory report' });
        }
    };

    const generateInventoryPDF = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const htmlContent = `<!DOCTYPE html>
        <html>
        <head>
            <title>Inventory Report - H2-MED Enterprises</title>
            <style>
                @page { size: A4 landscape; margin: 20mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #333; }
                .page { position: relative; min-height: 100vh; padding-bottom: 80px; }
                .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #dc2626; margin-bottom: 20px; }
                .company-name { color: #dc2626; font-size: 28pt; font-weight: bold; margin-bottom: 5px; }
                .header h1 { color: #333; font-size: 22pt; font-weight: bold; margin-bottom: 5px; }
                .header .subtitle { color: #666; font-size: 10pt; margin-bottom: 10px; }
                .header .report-info { display: flex; justify-content: space-between; margin-top: 10px; font-size: 8pt; color: #666; padding: 0 20px; }
                .summary { background: #eeeeee; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                .summary-item { text-align: center; }
                .summary-item .label { font-size: 8pt; color: #666; margin-bottom: 5px; }
                .summary-item .value { font-size: 16pt; font-weight: bold; color: #dc2626; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 7.5pt; }
                thead { background: #dc2626; color: white; }
                th { padding: 8px 4px; text-align: left; font-size: 7.5pt; font-weight: bold; border: 1px solid #dc2626; }
                td { padding: 5px 4px; border: 1px solid #ddd; font-size: 7.5pt; }
                tbody tr:nth-child(even) { background: #f9fafb; }
                .no-data { text-align: center; padding: 40px; color: #666; font-style: italic; }
                .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 15px 20mm; border-top: 2px solid #dc2626; background: white; font-size: 7pt; color: #666; }
                .footer-content { display: flex; justify-content: space-between; align-items: center; }
                .footer strong { color: #dc2626; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 6.5pt; font-weight: bold; }
                .stock-low { background: #fef3c7; color: #92400e; }
                .stock-out { background: #fee2e2; color: #991b1b; }
                .stock-ok { background: #dcfce7; color: #dc2626; }
                @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div class="company-name">H2-MED Enterprises</div>
                    <h1>INVENTORY REPORT</h1>
                    <div class="subtitle">Complete inventory listing with stock levels</div>
                    <div class="report-info">
                        <div><strong>Generated:</strong> ${currentDate}</div>
                        <div><strong>Total Items:</strong> ${items.length}</div>
                        <div><strong>Status Filter:</strong> ${statusFilter === 'all' ? 'All Items' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</div>
                        <div><strong>Category:</strong> ${categoryFilter === 'all' ? 'All Categories' : categories.find(c => c.id === parseInt(categoryFilter))?.name || 'All'}</div>
                    </div>
                </div>
                ${stats ? `
                <div class="summary">
                    <div class="summary-item">
                        <div class="label">Total Items</div>
                        <div class="value">${stats.total_items}</div>
                    </div>
                    <div class="summary-item">
                        <div class="label">Low Stock</div>
                        <div class="value">${stats.low_stock_items}</div>
                    </div>
                    <div class="summary-item">
                        <div class="label">Out of Stock</div>
                        <div class="value">${stats.out_of_stock_items}</div>
                    </div>
                    <div class="summary-item">
                        <div class="label">Total Value</div>
                        <div class="value">₱${formatPrice(stats.total_inventory_value)}</div>
                    </div>
                </div>
                ` : ''}
                ${items.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 18%;">Product Name</th>
                                <th style="width: 8%;">SKU</th>
                                <th style="width: 10%;">Batch</th>
                                <th style="width: 11%;">Category</th>
                                <th style="width: 11%;">Supplier</th>
                                <th style="width: 8%;">Stock</th>
                                <th style="width: 10%;">Status</th>
                                <th style="width: 7%;">Min</th>
                                <th style="width: 9%;">Price</th>
                                <th style="width: 8%;">Expiry</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item) => {
                                let stockStatus = 'In Stock';
                                let stockClass = 'stock-ok';
                                if (item.stock_quantity === 0) {
                                    stockStatus = 'Out';
                                    stockClass = 'stock-out';
                                } else if (item.stock_quantity <= item.minimum_stock) {
                                    stockStatus = 'Low';
                                    stockClass = 'stock-low';
                                }
                                return `
                                    <tr>
                                        <td><strong>${item.name}</strong></td>
                                        <td style="font-family: monospace; font-size: 6.5pt;">${item.sku}</td>
                                        <td>${item.batch_number || 'N/A'}</td>
                                        <td>${item.category?.name || 'N/A'}</td>
                                        <td>${item.supplier?.name || 'N/A'}</td>
                                        <td style="text-align: right; font-weight: bold;">${item.stock_quantity} ${item.unit}</td>
                                        <td><span class="badge ${stockClass}">${stockStatus}</span></td>
                                        <td style="text-align: right;">${item.minimum_stock}</td>
                                        <td style="text-align: right; font-weight: bold;">₱${formatPrice(item.price)}</td>
                                        <td>${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                ` : `<div class="no-data"><p>✓ No inventory items found</p></div>`}
                <div class="footer">
                    <div class="footer-content">
                        <div class="footer-left">
                            <strong>H2-MED Enterprises</strong> | Pharmacy Inventory System<br>
                            <div>Generated on: ${new Date().toLocaleString('en-US')}</div>
                        </div>
                        <div class="footer-right">
                            <div><strong>CONFIDENTIAL</strong></div>
                            <div>Page 1 of 1</div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 100);
                };
            </script>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    useEffect(() => {
        loadData();
    }, [pagination.current_page, statusFilter, categoryFilter, searchTerm]);

    // Monitor for out-of-stock items and transfer them automatically
    useEffect(() => {
        if (items.length > 0) {
            // Check for newly out-of-stock items in current data
            const outOfStock = items.filter(item => item.stock_quantity === 0);
            
            if (outOfStock.length > 0) {
                // Remove out-of-stock items from main table
                const inStockItems = items.filter(item => item.stock_quantity > 0);
                setItems(inStockItems);
                
                // Add to out-of-stock list if modal is open
                if (showOutOfStockView) {
                    setOutOfStockItems(prev => {
                        const newOutOfStock = outOfStock.filter(item => 
                            !prev.some(existing => existing.id === item.id)
                        );
                        return [...prev, ...newOutOfStock];
                    });
                }
            }
        }
    }, [items, showOutOfStockView]);

    // Listen for stock updates from other components (like Delivery Management)
    useEffect(() => {
        const handleStockUpdate = (event: CustomEvent) => {
            console.log('Stock update event received:', event.detail);
            // Refresh inventory data to show updated stock levels
            loadData();
        };

        // Add event listener for stock updates
        window.addEventListener('stockUpdate', handleStockUpdate as EventListener);

        // Cleanup event listener on component unmount
        return () => {
            window.removeEventListener('stockUpdate', handleStockUpdate as EventListener);
        };
    }, [pagination.current_page, statusFilter, categoryFilter, searchTerm]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [itemsResponse, statsResponse, categoriesResponse, suppliersResponse, allItemsResponse] = await Promise.all([
                inventoryService.getItems({
                    page: pagination.current_page,
                    per_page: pagination.per_page,
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    category_id: categoryFilter !== 'all' ? parseInt(categoryFilter) : undefined
                }),
                inventoryService.getStats(),
                categoryService.getCategories(),
                supplierService.getSuppliers(),
                // Fetch all items for Quotation modal
                inventoryService.getItems({
                    page: 1,
                    per_page: 10000,
                    search: '',
                    status: 'all',
                    category_id: undefined
                })
            ]);

            if (itemsResponse.success && itemsResponse.data) {
                // Filter out out-of-stock items from main table
                const inStockItems = itemsResponse.data.filter(item => item.stock_quantity > 0);
                setItems(inStockItems);
                setPagination({
                    ...pagination,
                    total: itemsResponse.pagination?.total || 0
                });
            }

            // Store all items for Quotation modal
            if (allItemsResponse.success && allItemsResponse.data) {
                console.log('Fetched all inventory items for Quotation modal:', allItemsResponse.data.length, 'items');
                setAllInventoryItems(allItemsResponse.data);
            }

            if (statsResponse.success && statsResponse.data) {
                setStats(statsResponse.data);
            }

            if (categoriesResponse.success && categoriesResponse.data) {
                setCategories(categoriesResponse.data);
            }

            if (suppliersResponse.success && suppliersResponse.data) {
                setSuppliers(suppliersResponse.data);
            }
        } catch (error: any) {
            setNotification({ type: 'error', message: error.message || 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async (itemData: InventoryFormData) => {
        try {
            if (selectedItem) {
                await inventoryService.updateItem(selectedItem.id, itemData);
                setNotification({ type: 'success', message: 'Item updated successfully' });
            } else {
                await inventoryService.createItem(itemData);
                setNotification({ type: 'success', message: 'Item created successfully' });
            }
            setShowItemModal(false);
            setSelectedItem(null);
            loadData();
        } catch (error: any) {
            setNotification({ type: 'error', message: error.message || 'Failed to save item' });
            throw error;
        }
    };

    const handleStockAdjustment = async (adjustmentData: StockAdjustmentData) => {
        if (!selectedItem) return;

        try {
            await inventoryService.adjustStock(selectedItem.id, adjustmentData);
            setNotification({ type: 'success', message: 'Stock adjusted successfully' });
            setShowStockModal(false);
            
            // Check if item was restocked (stock > 0)
            if (adjustmentData.type === 'in' || adjustmentData.quantity > 0) {
                // Remove from out-of-stock list if it was there
                if (showOutOfStockView) {
                    setOutOfStockItems(prev => prev.filter(item => item.id !== selectedItem.id));
                }
                
                // Add back to main inventory if it's now in stock
                const updatedItem = { ...selectedItem, stock_quantity: selectedItem.stock_quantity + adjustmentData.quantity };
                if (updatedItem.stock_quantity > 0) {
                    setItems(prev => {
                        // Check if item already exists in main list
                        if (!prev.some(item => item.id === selectedItem.id)) {
                            return [...prev, updatedItem];
                        }
                        return prev.map(item => item.id === selectedItem.id ? updatedItem : item);
                    });
                }
            }
            
            setSelectedItem(null);
            
            // Refresh main data
            await loadData();
            if (showOutOfStockView) {
                await fetchOutOfStockItems();
            }
        } catch (error: any) {
            setNotification({ type: 'error', message: error.message || 'Failed to adjust stock' });
        }
    };

    const handleDeleteItem = async () => {
        if (!selectedItem) return;

        try {
            await inventoryService.deleteItem(selectedItem.id);
            setNotification({ type: 'success', message: 'Item deleted successfully' });
            setShowDeleteModal(false);
            setSelectedItem(null);
            loadData();
        } catch (error: any) {
            setNotification({ type: 'error', message: error.message || 'Failed to delete item' });
        }
    };

    const handleCSVImport = async (csvData: CSVImportData[]) => {
        try {
            console.log('🔍 CSV Import completed, refreshing data...');
            console.log('📊 Import Summary:', {
                totalItems: csvData.length,
                timestamp: new Date().toISOString()
            });
            
            // Show success notification
            setNotification({ 
                type: 'success', 
                message: `Successfully imported ${csvData.length} inventory items from CSV` 
            });
            
            // Refresh all inventory data
            await loadData();
            
            console.log('✅ Data refresh completed after CSV import');
            
        } catch (error) {
            console.error('❌ Error refreshing data after CSV import:', error);
            setNotification({ 
                type: 'error', 
                message: 'Import completed but failed to refresh inventory data. Please refresh the page.' 
            });
        }
    };

    const handleEditItem = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowItemModal(true);
    };

    const handleStockAdjust = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowStockModal(true);
    };

    const handleDeleteConfirm = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowDeleteModal(true);
    };

    const fetchOutOfStockItems = async () => {
        try {
            setLoading(true);
            const response = await inventoryService.getItems({
                page: 1,
                per_page: 999, // Get all items including out-of-stock
                search: '',
                status: undefined,
                category_id: undefined
            });
            
            if (response.success && response.data) {
                // Filter only out-of-stock items (stock_quantity === 0)
                const outOfStock = response.data.filter(item => item.stock_quantity === 0);
                setOutOfStockItems(outOfStock);
                
                // Also update main table to remove any newly out-of-stock items
                const currentInStock = items.filter(item => item.stock_quantity > 0);
                setItems(currentInStock);
            }
        } catch (error: any) {
            setNotification({ type: 'error', message: error.message || 'Failed to fetch out of stock items' });
        } finally {
            setLoading(false);
        }
    };

    const handleShowOutOfStock = () => {
        setShowOutOfStockView(true);
        fetchOutOfStockItems();
    };

    const handleCloseOutOfStock = () => {
        setShowOutOfStockView(false);
        setOutOfStockItems([]);
    };

    const handleShowQuotation = async () => {
        console.log('🔍 Opening Quotation modal...');
        console.log('🔍 Current items state length:', items.length);
        console.log('🔍 Current allInventoryItems state length:', allInventoryItems.length);
        
        setShowQuotationModal(true);
        setLoading(true);
        
        try {
            console.log('🔍 Fetching inventory items for quotation...');
            // Fetch all inventory items for quotation (both in-stock and out-of-stock)
            const [response, outOfStockResponse] = await Promise.all([
                inventoryService.getItems({
                    page: 1,
                    per_page: 10000,
                    search: '',
                    status: 'all',
                    category_id: undefined
                }),
                // Explicitly fetch out-of-stock items to ensure they're included
                inventoryService.getItems({
                    page: 1,
                    per_page: 10000,
                    search: '',
                    status: undefined,
                    category_id: undefined
                })
            ]);
            
            console.log('🔍 API Response (regular):', response);
            console.log('🔍 API Response (out-of-stock):', outOfStockResponse);
            
            // Combine both responses and remove duplicates
            const allItems: InventoryItem[] = [];
            const itemIds = new Set<number>();
            
            // Add items from first response
            if (response.success && response.data) {
                response.data.forEach(item => {
                    if (!itemIds.has(item.id)) {
                        itemIds.add(item.id);
                        allItems.push(item);
                    }
                });
            }
            
            // Add items from second response (out-of-stock)
            if (outOfStockResponse.success && outOfStockResponse.data) {
                outOfStockResponse.data.forEach(item => {
                    if (!itemIds.has(item.id)) {
                        itemIds.add(item.id);
                        allItems.push(item);
                    }
                });
            }
            
            console.log('✅ Total unique items fetched:', allItems.length);
            
            if (allItems.length > 0) {
                const mappedItems = allItems.map(item => ({
                    item,
                    quantity: ''
                }));
                
                console.log('🔍 Mapped items:', mappedItems.length);
                setQuotationItems(mappedItems);
                setAllInventoryItems(allItems);
            } else {
                console.log('❌ API Responses failed or empty, using fallback...');
                // Fallback to current items if API fails
                const fallbackItems = items.map(item => ({
                    item,
                    quantity: ''
                }));
                console.log('🔍 Using fallback items:', fallbackItems.length);
                setQuotationItems(fallbackItems);
                
                setNotification({ type: 'warning', message: 'Using current inventory data' });
            }
        } catch (error) {
            console.error('❌ Error fetching inventory items for quotation:', error);
            // Fallback to current items on error
            const fallbackItems = items.map(item => ({
                item,
                quantity: ''
            }));
            console.log('🔍 Using fallback items due to error:', fallbackItems.length);
            setQuotationItems(fallbackItems);
            setNotification({ type: 'warning', message: 'Using current inventory data' });
        } finally {
            setLoading(false);
            console.log('🔍 Loading finished. quotationItems.length:', quotationItems.length);
        }
    };

    const handleCloseQuotation = () => {
        setShowQuotationModal(false);
        setQuotationCustomerName('');
        setQuotationItems([]);
    };

    const handleQuantityChange = (index: number, quantity: string) => {
        setQuotationItems(prev => 
            prev.map((qi, i) => 
                i === index 
                    ? { ...qi, quantity }
                    : qi
            )
        );
    };

    const handleExportQuotationPDF = () => {
        console.log('🔍 Starting quotation export...');
        
        try {
            // Validate customer name
            if (!quotationCustomerName || !quotationCustomerName.trim()) {
                console.log('❌ Customer name validation failed');
                setNotification({ type: 'error', message: 'Please enter customer name' });
                return;
            }
            
            console.log('✅ Customer name validated:', quotationCustomerName);
            
            // Validate quotation items
            if (!quotationItems || quotationItems.length === 0) {
                console.log('❌ No quotation items available');
                setNotification({ type: 'error', message: 'No quotation items available' });
                return;
            }
            
            console.log('✅ Quotation items available:', quotationItems.length);
            
            // Filter valid items with quantity > 0
            const validItems = quotationItems.filter(qi => {
                const hasItem = qi && qi.item;
                const hasQuantity = qi.quantity && qi.quantity.trim() !== '';
                const quantityValid = parseInt(qi.quantity) > 0;
                console.log('🔍 Item validation:', {
                    hasItem,
                    hasQuantity,
                    quantity: qi.quantity,
                    quantityValid,
                    itemName: qi.item?.name
                });
                return hasItem && hasQuantity && quantityValid;
            });
            
            console.log('✅ Valid items filtered:', validItems.length);
            
            if (validItems.length === 0) {
                console.log('❌ No valid items with quantity > 0');
                setNotification({ type: 'error', message: 'Please add at least one item with quantity > 0 to the quotation' });
                return;
            }
            
            // Try the export
            console.log('🔍 Calling PDF generation...');
            generateQuotationPDF(quotationCustomerName, validItems);
            setNotification({ type: 'success', message: 'Quotation exported successfully' });
            
        } catch (error: any) {
            console.error('❌ Export error:', error);
            setNotification({ type: 'error', message: `Export failed: ${error?.message || error?.toString() || 'Unknown error'}` });
        }
    };

    const generateQuotationPDF = (customerName: string, quotationItems: any[]) => {
        console.log('🔍 Starting PDF generation...');
        
        try {
            // Create a simple HTML content first
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            console.log('🔍 Creating HTML content...');
            
            // Calculate totals safely
            let totalValue = 0;
            let totalQuantity = 0;
            
            quotationItems.forEach((qi, index) => {
                const quantity = parseInt(qi.quantity) || 0;
                const price = parseFloat(qi.item?.price) || 0;
                const itemTotal = quantity * price;
                totalValue += itemTotal;
                totalQuantity += quantity;
                
                console.log(`🔍 Item ${index + 1}:`, {
                    name: qi.item?.name,
                    quantity: qi.quantity,
                    price: qi.item?.price,
                    itemTotal
                });
            });
            
            console.log('🔍 Calculated totals:', { totalValue, totalQuantity });
            
            // Create simple HTML
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Quotation - H2-MED Enterprises</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid red; padding-bottom: 20px; margin-bottom: 20px; }
        .company-name { color: red; font-size: 24px; font-weight: bold; }
        .customer-info { background: red; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid red; padding: 8px; text-align: left; }
        th { background-color: red; color: white; }
        .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .total { font-size: 18px; font-weight: bold; color: red; }
        @media print { body { margin: 10px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">H2-MED Enterprises</div>
        <h1>QUOTATION</h1>
        <p>Generated: ${currentDate}</p>
    </div>
    
    <div class="customer-info">
        <h3>Customer: ${customerName}</h3>
        <p>Quotation #: Q-${Date.now()}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${quotationItems.map(qi => {
                const quantity = parseInt(qi.quantity) || 0;
                const price = parseFloat(qi.item?.price) || 0;
                const total = quantity * price;
                return `
                    <tr>
                        <td>${qi.item?.name || 'Unknown Product'}</td>
                        <td>${quantity}</td>
                        <td>₱${price.toFixed(2)}</td>
                        <td>₱${total.toFixed(2)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>
    
    <div class="summary">
        <p><strong>Total Items:</strong> ${quotationItems.length}</p>
        <p><strong>Total Quantity:</strong> ${totalQuantity}</p>
        <p class="total"><strong>Total Amount:</strong> ₱${totalValue.toFixed(2)}</p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: red;">
        <p>H2-MED Enterprises | Pharmacy Inventory System</p>
        <p>Thank you for your business!</p>
    </div>
</body>
</html>
            `;
            
            console.log('🔍 Opening print window...');
            
            // Try to open print window
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                console.error('❌ Failed to open print window');
                throw new Error('Failed to open print window. Please allow popups for this site.');
            }
            
            console.log('✅ Print window opened successfully');
            
            // Write content to window
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            console.log('✅ Content written to window');
            
            // Wait a moment then print
            setTimeout(() => {
                try {
                    printWindow.print();
                    console.log('✅ Print dialog opened');
                } catch (printError) {
                    console.error('❌ Print error:', printError);
                    // Don't throw error, just log it
                }
            }, 500);
            
            console.log('✅ PDF generation completed');
            
        } catch (error: any) {
            console.error('❌ PDF generation error:', error);
            throw error;
        }
    };

    const handlePageChange = (page: number) => {
        setPagination({ ...pagination, current_page: page });
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;

        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(pagination.last_page, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                <div className="flex items-center text-xs text-gray-500">
                    Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} items
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => handlePageChange(1)}
                                className="px-2 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs"
                            >
                                1
                            </button>
                            {startPage > 2 && <span className="px-2 text-gray-500 text-xs">...</span>}
                        </>
                    )}

                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-2 py-1.5 rounded-lg border transition-colors text-xs ${
                                page === pagination.current_page
                                    ? 'bg-[#ff1a1a] text-white border-[#ff1a1a]'
                                    : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < pagination.last_page && (
                        <>
                            {endPage < pagination.last_page - 1 && <span className="px-2 text-gray-500 text-xs">...</span>}
                            <button
                                onClick={() => handlePageChange(pagination.last_page)}
                                className="px-2 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs"
                            >
                                {pagination.last_page}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.last_page}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
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
                            <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] p-2 rounded-lg mr-3 shadow-lg">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                                <p className="text-sm text-gray-600">Manage your inventory items and stock levels</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={handleShowOutOfStock}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm font-medium"
                            >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Out of Stock
                            </button>
                            <button 
                                onClick={handleShowQuotation}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Quotation
                            </button>
                            <button 
                                onClick={handleExportPDF} 
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm font-medium"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </button>
                            
                            <button
                                onClick={() => setShowCSVImportModal(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm font-medium"
                            >
                                <FileUp className="h-4 w-4 mr-2" />
                                Import CSV
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedItem(null);
                                    setShowItemModal(true);
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:shadow-md transition-all flex items-center text-sm font-medium"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add New Item
                            </button>
                        </div>
                    </div>

                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatsCard
                                title="Total Items"
                                value={stats.total_items}
                                subtitle="All inventory items"
                                icon={Package}
                                color="bg-gradient-to-br from-blue-500 to-blue-600"
                            />
                            <StatsCard
                                title="Low Stock"
                                value={stats.low_stock_items}
                                subtitle="Items below minimum"
                                icon={AlertTriangle}
                                color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                            />
                            <StatsCard
                                title="Out of Stock"
                                value={stats.out_of_stock_items}
                                subtitle="Items with no stock"
                                icon={XCircle}
                                color="bg-gradient-to-br from-red-500 to-red-600"
                            />
                            <StatsCard
                                title="Total Value"
                                value={`₱${formatPrice(stats.total_inventory_value)}`}
                                subtitle="Inventory worth"
                                icon={DollarSign}
                                color="bg-gradient-to-br from-green-500 to-green-600"
                            />
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Batch</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center">
                                                <Loader2 className="animate-spin h-6 w-6 mx-auto text-[#ff1a1a]" />
                                                <p className="mt-2 text-gray-500 text-sm">Loading items...</p>
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center">
                                                <Package className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                                                <p className="text-gray-500 text-sm">No items found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                                                            {item.images && item.images.length > 0 ? (
                                                                <img 
                                                                    src={item.images[0]} 
                                                                    alt={item.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full bg-gradient-to-br from-[#ff1a1a] to-[#ff3333] flex items-center justify-center">
                                                                    <Package className="h-5 w-5 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {item.batch_number ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                                                {item.batch_number}
                                                            </span>
                                                            {item.expiry_date && (
                                                                <span className="text-xs text-gray-500 mt-1">
                                                                    Exp: {new Date(item.expiry_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No batch</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-medium">{item.category?.name || 'N/A'}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {item.stock_quantity} {item.unit}
                                                        </div>
                                                        {getStockStatus(item)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        ₱{formatPrice(item.price)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-medium">
                                                        {item.supplier?.name || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="flex justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleStockAdjust(item)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Adjust Stock"
                                                        >
                                                            <TrendingUp className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditItem(item)}
                                                            className="p-1.5 text-[#ff1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Edit Item"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConfirm(item)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {renderPagination()}
                    </div>

                    <InventoryModal
                        isOpen={showItemModal}
                        onClose={() => {
                            setShowItemModal(false);
                            setSelectedItem(null);
                        }}
                        item={selectedItem}
                        onSave={handleSaveItem}
                        categories={categories}
                        suppliers={suppliers}
                        loading={loading}
                        allItems={items}
                    />

                    <StockAdjustmentModal
                        isOpen={showStockModal}
                        onClose={() => {
                            setShowStockModal(false);
                            setSelectedItem(null);
                        }}
                        item={selectedItem}
                        onSave={handleStockAdjustment}
                        loading={loading}
                    />
                    
                    <DeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedItem(null);
                        }}
                        onConfirm={handleDeleteItem}
                        item={selectedItem}
                        loading={loading}
                    />

                    <CSVImportModal
                        isOpen={showCSVImportModal}
                        onClose={() => setShowCSVImportModal(false)}
                        onImport={handleCSVImport}
                        categories={categories}
                        suppliers={suppliers}
                    />

                    {/* Quotation Modal */}
                    {showQuotationModal && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-center justify-center p-4">
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                                     onClick={handleCloseQuotation}></div>
                                
                                <div className="relative w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                    <div className="bg-blue-600 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <FileText className="h-6 w-6 text-white mr-3" />
                                                <h2 className="text-xl font-bold text-white">Create Quotation</h2>
                                            </div>
                                            <button 
                                                onClick={handleCloseQuotation} 
                                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 max-h-[80vh] overflow-y-auto">
                                        {/* Customer Name Input */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Customer Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all border-gray-200"
                                                    value={quotationCustomerName}
                                                    onChange={(e) => setQuotationCustomerName(e.target.value)}
                                                    placeholder="Enter customer name..."
                                                />
                                            </div>
                                        </div>

                                        {loading ? (
                                            <div className="flex justify-center py-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : quotationItems.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Available</h3>
                                                <p className="text-gray-500">No inventory products found!</p>
                                                <p className="text-xs text-gray-400 mt-2">Debug: quotationItems.length = {quotationItems.length}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <ShoppingCart className="h-5 w-5 text-blue-600 mr-2" />
                                                            <span className="text-blue-800 font-medium">
                                                                {quotationItems.length} product{quotationItems.length !== 1 ? 's' : ''} available for quotation
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full font-medium">
                                                                {quotationItems.filter(qi => qi.item && qi.item.stock_quantity > 0).length} In Stock
                                                            </span>
                                                            <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full font-medium">
                                                                {quotationItems.filter(qi => qi.item && qi.item.stock_quantity === 0).length} Out of Stock
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {quotationItems.map((qi, index) => {
                                                                const numericQuantity = parseInt(qi.quantity) || 0;
                                                                const totalPrice = (qi.item?.price || 0) * numericQuantity;
                                                                const isOutOfStock = qi.item?.stock_quantity === 0;
                                                                
                                                                return (
                                                                    <tr key={index} className={`hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50/50' : ''}`}>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <span className="font-mono text-sm text-gray-900">{qi.item?.sku || 'N/A'}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center">
                                                                                <div className={`text-sm font-medium ${isOutOfStock ? 'text-red-700' : 'text-gray-900'}`}>{qi.item?.name || 'Unknown Product'}</div>
                                                                                {isOutOfStock && (
                                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                                                        OUT OF STOCK
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {qi.item?.description && (
                                                                                <div className="text-xs text-gray-500 truncate max-w-xs">{qi.item.description}</div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <span className="text-sm text-gray-900">{qi.item?.category?.name || 'N/A'}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <div className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                                                {qi.item?.stock_quantity || 0} {qi.item?.unit || 'pcs'}
                                                                            </div>
                                                                            {qi.item && (
                                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                                    isOutOfStock
                                                                                        ? 'bg-red-100 text-red-800' 
                                                                                        : 'bg-green-100 text-green-800'
                                                                                }`}>
                                                                                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <span className="text-sm font-medium text-gray-900">₱{formatPrice(qi.item?.price || 0)}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            {qi.item ? (
                                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                                    qi.item.status === 'active' 
                                                                                        ? 'bg-green-100 text-green-800' 
                                                                                        : 'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {qi.item.status === 'active' ? 'Active' : 'Inactive'}
                                                                                </span>
                                                                            ) : (
                                                                                '-'
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            <span className="text-sm text-gray-900">{qi.item?.supplier?.name || 'N/A'}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={999}
                                                                                value={qi.quantity}
                                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                                className={`w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                                                    isOutOfStock 
                                                                                        ? 'bg-yellow-50 border-yellow-300 text-yellow-700' 
                                                                                        : 'border-gray-300'
                                                                                }`}
                                                                                placeholder="0"
                                                                            />
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                                                            ₱{formatPrice(totalPrice)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Summary */}
                                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-blue-50 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Package className="h-5 w-5 text-blue-600" />
                                                            <span className="text-sm font-medium text-blue-700">Items in Quotation</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-blue-900">
                                                            {quotationItems.filter(qi => qi.item && qi.quantity && parseInt(qi.quantity) > 0).length}
                                                        </p>
                                                        <p className="text-xs text-blue-600">of {quotationItems.length} available</p>
                                                    </div>
                                                    <div className="bg-green-50 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <DollarSign className="h-5 w-5 text-green-600" />
                                                            <span className="text-sm font-medium text-green-700">Total Value</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-green-900">
                                                            ₱{formatPrice(quotationItems.reduce((sum, qi) => {
                                                                const quantity = parseInt(qi.quantity) || 0;
                                                                return sum + ((qi.item?.price || 0) * quantity);
                                                            }, 0))}
                                                        </p>
                                                    </div>
                                                    <div className="bg-purple-50 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <ShoppingCart className="h-5 w-5 text-purple-600" />
                                                            <span className="text-sm font-medium text-purple-700">Customer</span>
                                                        </div>
                                                        <p className="text-lg font-bold text-purple-900 truncate">{quotationCustomerName || 'Not specified'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 px-6 py-4 border-t">
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={handleCloseQuotation}
                                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleExportQuotationPDF}
                                                className="px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Export PDF
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Out of Stock Modal */}
                    {showOutOfStockView && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-center justify-center p-4">
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                                     onClick={handleCloseOutOfStock}></div>
                                
                                <div className="relative w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                    <div className="bg-red-600 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <AlertCircle className="h-6 w-6 text-white mr-3" />
                                                <h2 className="text-xl font-bold text-white">Out of Stock Products</h2>
                                            </div>
                                            <button 
                                                onClick={handleCloseOutOfStock} 
                                                className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 max-h-[80vh] overflow-y-auto">
                                        {loading ? (
                                            <div className="flex justify-center py-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                            </div>
                                        ) : outOfStockItems.length === 0 ? (
                                            <div className="text-center py-12">
                                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Out of Stock Products</h3>
                                                <p className="text-gray-500">All products are currently in stock!</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                                                    <div className="flex items-center">
                                                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                                                        <span className="text-red-800 font-medium">
                                                            {outOfStockItems.length} product{outOfStockItems.length !== 1 ? 's' : ''} out of stock
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {outOfStockItems.map((item) => (
                                                                <tr key={item.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="font-mono text-sm text-gray-900">{item.sku}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                                        {item.description && (
                                                                            <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-900">{item.category?.name || 'N/A'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-900">{item.supplier?.name || 'N/A'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="text-sm font-medium text-gray-900">₱{formatPrice(item.price)}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-900">{item.minimum_stock}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        {getStatusBadge(item.status)}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedItem(item);
                                                                                setShowStockModal(true);
                                                                            }}
                                                                            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                                        >
                                                                            <RefreshCw className="h-4 w-4 mr-1" />
                                                                            Restock
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end p-6 pt-0">
                                        <button
                                            onClick={handleCloseOutOfStock}
                                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {notification && (
                        <Notification
                            type={notification.type}
                            message={notification.message}
                            onClose={() => setNotification(null)}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}