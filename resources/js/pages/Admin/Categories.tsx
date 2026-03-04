import AppLayout from '@/layouts/app-layout';
import { Package, Search, PlusCircle, RefreshCw, Download, Edit, Trash2, Filter, X, Tag, CheckCircle, XCircle } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { categoryService, Category, CategoryFormData, PaginationData, ApiResponse } from '../../../services/categoryServices';

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'active': "bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white shadow-md",
        'inactive': "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md"
    };
    
    return (
        <span className={`${styles[status]} text-xs font-semibold px-2 py-1 rounded-full capitalize`}>
            {status}
        </span>
    );
};

const CategoryModal = ({ 
    isOpen, 
    onClose, 
    category, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    category?: Category | null; 
    onSave: (categoryData: CategoryFormData) => void; 
}) => {
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        status: 'active'
    });
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                description: category.description || '',
                status: category.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                description: '',
                status: 'active'
            });
        }
        setErrors({});
    }, [category, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">
                                {category ? 'Edit Category' : 'Add New Category'}
                            </h2>
                            <button 
                                onClick={onClose} 
                                className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g., Pain Relievers, Antibiotics"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Brief description of this category"
                                    rows={3}
                                />
                                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status[0]}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                            >
                                {category ? 'Update' : 'Create'} Category
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
    categoryName 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    categoryName: string; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3">
                        <h2 className="text-lg font-bold text-white">Delete Category</h2>
                    </div>
                    
                    <div className="p-4">
                        <p className="text-gray-600 mb-4 text-sm">
                            Are you sure you want to delete <strong className="text-gray-900">{categoryName}</strong>? This action cannot be undone.
                        </p>
                        
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                            >
                                Delete
                            </button>
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
    type: 'success' | 'error'; 
    message: string; 
    onClose: () => void; 
}) => {
    const bgColor = type === 'success' 
        ? 'bg-gradient-to-r from-green-500 to-green-600' 
        : 'bg-gradient-to-r from-red-500 to-red-600';
    
    const icon = type === 'success' 
        ? <CheckCircle className="h-5 w-5 text-white" />
        : <XCircle className="h-5 w-5 text-white" />;
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
            <div className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm min-w-[300px] max-w-md`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {icon}
                        <p className="text-sm font-medium text-white">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-200 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function CategoriesPage() {
    const { auth } = usePage().props as any;
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchCategories = async (page = 1) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                per_page: pagination.per_page,
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter !== 'All' && { status: statusFilter.toLowerCase() })
            };

            const response = await categoryService.getCategories(params);
            setCategories(response.data);
            setPagination(response.pagination);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCategory = async (categoryData: CategoryFormData) => {
        try {
            let response;
            
            if (selectedCategory) {
                response = await categoryService.updateCategory(selectedCategory.id, categoryData);
            } else {
                response = await categoryService.createCategory(categoryData);
            }

            showNotification('success', response.message || `Category ${selectedCategory ? 'updated' : 'created'} successfully`);
            setShowCategoryModal(false);
            setSelectedCategory(null);
            fetchCategories(pagination.current_page);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to save category');
        }
    };

    const handleDeleteCategory = async () => {
        if (!selectedCategory) return;
        
        try {
            const response = await categoryService.deleteCategory(selectedCategory.id);
            showNotification('success', response.message || 'Category deleted successfully');
            setShowDeleteModal(false);
            setSelectedCategory(null);
            fetchCategories(pagination.current_page);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to delete category');
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCategories(1);
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter]);

    const handlePageChange = (page: number) => {
        fetchCategories(page);
    };

    const handleExport = () => {
        try {
            generatePDF();
            showNotification('success', 'Categories PDF exported successfully');
        } catch (error) {
            showNotification('error', 'Failed to export categories data');
        }
    };

    const generatePDF = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Categories Report</title>
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 10pt;
                        line-height: 1.4;
                        color: #333;
                    }
                    
                    .page {
                        position: relative;
                        min-height: 100vh;
                        padding-bottom: 80px;
                    }
                    
                    .header {
                        text-align: center;
                        padding: 20px 0;
                        border-bottom: 3px solid #dc2626;
                        margin-bottom: 20px;
                    }
                    
                    .company-name { color: #dc2626; font-size: 28pt; font-weight: bold; margin-bottom: 5px; }
                    
                    .header h1 {
                        color: #dc2626;
                        font-size: 24pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .header .subtitle {
                        color: #666;
                        font-size: 11pt;
                        margin-bottom: 10px;
                    }
                    
                    .header .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    .summary {
                        background: #dcfce7;
                        border: 2px solid #dc2626;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                    }
                    
                    .summary-item {
                        text-align: center;
                    }
                    
                    .summary-item .label {
                        font-size: 9pt;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    
                    .summary-item .value {
                        font-size: 18pt;
                        font-weight: bold;
                        color: #dc2626;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    
                    thead {
                        background: #dc2626;
                        color: white;
                    }
                    
                    th {
                        padding: 10px 8px;
                        text-align: left;
                        font-size: 9pt;
                        font-weight: bold;
                        border: 1px solid #dc2626;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 9pt;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #f9fafb;
                    }
                    
                    tbody tr:hover {
                        background: #dcfce7;
                    }
                    
                    .no-data {
                        text-align: center;
                        padding: 40px;
                        color: #666;
                        font-style: italic;
                    }
                    
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 15px 20mm;
                        border-top: 2px solid #dc2626;
                        background: white;
                        font-size: 8pt;
                        color: #666;
                    }
                    
                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .footer strong {
                        color: #dc2626;
                    }
                    
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 8pt;
                        font-weight: bold;
                    }
                    
                    .status-active {
                        background: #dcfce7;
                        color: #dc2626;
                    }
                    
                    .status-inactive {
                        background: #f3f4f6;
                        color: #6b7280;
                    }
                    
                    @media print {
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="company-name">H2-MED Enterprises</div>
                        <h1>CATEGORIES REPORT</h1>
                        <div class="subtitle">Complete list of product categories</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> All Time</div>
                            <div><strong>Generated by:</strong> ${auth.user?.name || 'User'}</div>
                            <div><strong>Status:</strong> ${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</div>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Categories</div>
                            <div class="value">${categories.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Active Categories</div>
                            <div class="value">${categories.filter(c => c.status === 'active').length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Total Items</div>
                            <div class="value">${categories.reduce((sum, c) => sum + (c.inventory_items_count || 0), 0)}</div>
                        </div>
                    </div>
                    
                    ${categories.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%;">#</th>
                                    <th style="width: 25%;">Category Name</th>
                                    <th style="width: 40%;">Description</th>
                                    <th style="width: 10%;">Status</th>
                                    <th style="width: 10%;">Items</th>
                                    <th style="width: 10%;">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categories.map((category, index) => `
                                    <tr>
                                        <td style="text-align: center;">${index + 1}</td>
                                        <td><strong>${category.name}</strong></td>
                                        <td>${category.description || 'No description'}</td>
                                        <td>
                                            <span class="status-badge status-${category.status}">
                                                ${category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                                            </span>
                                        </td>
                                        <td style="text-align: right;">${category.inventory_items_count || 0}</td>
                                        <td>${new Date(category.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No categories found</p>
                        </div>
                    `}
                    
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
                        setTimeout(function() {
                            window.close();
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleEditCategory = (category: Category) => {
        setSelectedCategory(category);
        setShowCategoryModal(true);
    };

    const handleDeleteConfirm = (category: Category) => {
        setSelectedCategory(category);
        setShowDeleteModal(true);
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;
        
        const pages = [];
        const maxPages = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxPages / 2));
        let endPage = Math.min(pagination.last_page, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button 
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-4 py-2 mx-1 rounded-lg font-medium transition-all ${
                        i === pagination.current_page ? 
                        'bg-[#00c951] text-white shadow-lg' : 
                        'bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return (
            <div className="flex justify-center items-center mt-4 space-x-1">
                <button 
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1.5 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                    Previous
                </button>
                
                {pages}
                
                <button 
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-1.5 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                    Next
                </button>
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
                                <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
                                <p className="text-sm text-gray-600">Organize your inventory into logical categories</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setShowCategoryModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Category
                            </button>
                            <button 
                                onClick={handleExport}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </button>
                            <button 
                                onClick={() => fetchCategories(pagination.current_page)}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    placeholder="Search categories..."
                                />
                            </div>
                            <div className="flex items-center">
                                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                >
                                    <option value="All">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items Count</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="h-6 w-6 text-[#ff1a1a] animate-spin" />
                                                </div>
                                                <p className="mt-2 text-gray-500 text-sm">Loading categories...</p>
                                            </td>
                                        </tr>
                                    ) : categories.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Package className="h-10 w-10 text-gray-300 mb-3" />
                                                    <p className="text-gray-500 text-sm">No categories found</p>
                                                    <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        categories.map((category) => (
                                            <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ff1a1a] to-[#ff3333] flex items-center justify-center shadow-md">
                                                            <Tag className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                                                            <div className="text-xs text-gray-500">ID: {category.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {category.description || 'No description'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getStatusBadge(category.status)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {category.inventory_items_count || 0} items
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(category.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="flex justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleEditCategory(category)}
                                                            className="p-1.5 text-[#ff1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Edit Category"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConfirm(category)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Category"
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

                    <CategoryModal
                        isOpen={showCategoryModal}
                        onClose={() => {
                            setShowCategoryModal(false);
                            setSelectedCategory(null);
                        }}
                        category={selectedCategory}
                        onSave={handleSaveCategory}
                    />
                    
                    <DeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedCategory(null);
                        }}
                        onConfirm={handleDeleteCategory}
                        categoryName={selectedCategory?.name || ''}
                    />

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