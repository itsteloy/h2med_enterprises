import AppLayout from '@/layouts/app-layout';
import { Truck, Search, PlusCircle, RefreshCw, Download, Edit, Trash2, Filter, X, Mail, Phone, MapPin, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { supplierService, Supplier, SupplierFormData, SupplierStats, PaginationData } from '../../../services/supplierServices';

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

const SupplierModal = ({ 
    isOpen, 
    onClose, 
    supplier, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    supplier?: Supplier | null; 
    onSave: (supplierData: SupplierFormData) => void; 
}) => {
    const [formData, setFormData] = useState<SupplierFormData>({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        status: 'active'
    });
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name || '',
                contact_person: supplier.contact_person || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                status: supplier.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                contact_person: '',
                email: '',
                phone: '',
                address: '',
                status: 'active'
            });
        }
        setErrors({});
    }, [supplier, isOpen]);

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
                
                <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">
                                {supplier ? 'Edit Supplier' : 'Add New Supplier'}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g., ABC Pharmaceuticals"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                                    placeholder="Contact person name"
                                />
                                {errors.contact_person && <p className="text-red-500 text-xs mt-1">{errors.contact_person[0]}</p>}
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

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="contact@supplier.com"
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="+63 XXX XXX XXXX"
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    placeholder="Complete address"
                                    rows={3}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address[0]}</p>}
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
                                {supplier ? 'Update' : 'Create'} Supplier
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
    supplierName 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    supplierName: string; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3">
                        <h2 className="text-lg font-bold text-white">Delete Supplier</h2>
                    </div>
                    
                    <div className="p-4">
                        <p className="text-gray-600 mb-4 text-sm">
                            Are you sure you want to delete <strong className="text-gray-900">{supplierName}</strong>? This action cannot be undone.
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
        ? 'bg-[#00c951]' 
        : 'bg-gradient-to-r from-red-500 to-red-600';
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
            <div className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{message}</div>
                    <button 
                        onClick={onClose}
                        className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SuppliersPage() {
    const { auth } = usePage().props as any;
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stats, setStats] = useState<SupplierStats>({
        total_suppliers: 0,
        active_suppliers: 0,
        inactive_suppliers: 0,
        suppliers_with_items: 0,
        suppliers_without_items: 0,
        top_suppliers: [],
        recently_added: []
    });
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchSuppliers = async (page = 1) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                per_page: pagination.per_page,
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter !== 'All' && { status: statusFilter.toLowerCase() })
            };

            const response = await supplierService.getSuppliers(params);
            setSuppliers(response.data);
            setPagination(response.pagination);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to fetch suppliers');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await supplierService.getSupplierStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSaveSupplier = async (supplierData: SupplierFormData) => {
        try {
            let response;
            
            if (selectedSupplier) {
                response = await supplierService.updateSupplier(selectedSupplier.id, supplierData);
            } else {
                response = await supplierService.createSupplier(supplierData);
            }

            showNotification('success', response.message || `Supplier ${selectedSupplier ? 'updated' : 'created'} successfully`);
            setShowSupplierModal(false);
            setSelectedSupplier(null);
            fetchSuppliers(pagination.current_page);
            fetchStats();
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to save supplier');
        }
    };

    const handleDeleteSupplier = async () => {
        if (!selectedSupplier) return;
        
        try {
            const response = await supplierService.deleteSupplier(selectedSupplier.id);
            showNotification('success', response.message || 'Supplier deleted successfully');
            setShowDeleteModal(false);
            setSelectedSupplier(null);
            fetchSuppliers(pagination.current_page);
            fetchStats();
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to delete supplier');
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchStats();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchSuppliers(1);
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter]);

    const handlePageChange = (page: number) => {
        fetchSuppliers(page);
    };

    const handleExport = () => {
        try {
            generatePDF();
            showNotification('success', 'Suppliers PDF exported successfully');
        } catch (error) {
            showNotification('error', 'Failed to export suppliers data');
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
                <title>Suppliers Report</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 20mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 9pt;
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
                        font-size: 22pt;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-bottom: 10px;
                    }
                    
                    .header .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 8pt;
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
                        font-size: 8pt;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    
                    .summary-item .value {
                        font-size: 16pt;
                        font-weight: bold;
                        color: #dc2626;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 8pt;
                    }
                    
                    thead {
                        background: #dc2626;
                        color: white;
                    }
                    
                    th {
                        padding: 8px 6px;
                        text-align: left;
                        font-size: 8pt;
                        font-weight: bold;
                        border: 1px solid #dc2626;
                    }
                    
                    td {
                        padding: 6px;
                        border: 1px solid #ddd;
                        font-size: 8pt;
                    }
                    
                    tbody tr:nth-child(even) {
                        background: #f9fafb;
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
                        padding: 15px 15mm;
                        border-top: 2px solid #dc2626;
                        background: white;
                        font-size: 7pt;
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
                        padding: 3px 10px;
                        border-radius: 10px;
                        font-size: 7pt;
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
                        <h1>SUPPLIERS REPORT</h1>
                        <div class="subtitle">Complete list of suppliers</div>
                        <div class="report-info">
                            <div><strong>Generated:</strong> ${currentDate}</div>
                            <div><strong>Date Range:</strong> All Time</div>
                            <div><strong>Generated by:</strong> ${auth.user?.name || 'User'}</div>
                            <div><strong>Status:</strong> ${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</div>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Suppliers</div>
                            <div class="value">${suppliers.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Active Suppliers</div>
                            <div class="value">${suppliers.filter(s => s.status === 'active').length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Total Products</div>
                            <div class="value">${suppliers.reduce((sum, s) => sum + (s.inventory_items_count || 0), 0)}</div>
                        </div>
                    </div>
                    
                    ${suppliers.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 4%;">#</th>
                                    <th style="width: 18%;">Supplier Name</th>
                                    <th style="width: 12%;">Contact Person</th>
                                    <th style="width: 12%;">Phone</th>
                                    <th style="width: 15%;">Email</th>
                                    <th style="width: 20%;">Address</th>
                                    <th style="width: 8%;">Status</th>
                                    <th style="width: 6%;">Products</th>
                                    <th style="width: 5%;">Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${suppliers.map((supplier, index) => `
                                    <tr>
                                        <td style="text-align: center;">${index + 1}</td>
                                        <td><strong>${supplier.name}</strong></td>
                                        <td>${supplier.contact_person || '-'}</td>
                                        <td>${supplier.phone || '-'}</td>
                                        <td style="font-size: 7pt;">${supplier.email || '-'}</td>
                                        <td style="font-size: 7pt;">${supplier.address || '-'}</td>
                                        <td>
                                            <span class="status-badge status-${supplier.status}">
                                                ${supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">${supplier.inventory_items_count || 0}</td>
                                        <td style="text-align: center;">${supplier.rating ? supplier.rating.toFixed(1) + '/5' : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No suppliers found</p>
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

    const handleEditSupplier = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setShowSupplierModal(true);
    };

    const handleDeleteConfirm = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
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
                                <Truck className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
                                <p className="text-sm text-gray-600">Manage your supply chain partners</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => {
                                    setSelectedSupplier(null);
                                    setShowSupplierModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Supplier
                            </button>
                            <button 
                                onClick={handleExport}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </button>
                            <button 
                                onClick={() => {
                                    fetchSuppliers(pagination.current_page);
                                    fetchStats();
                                }}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Total Suppliers</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.total_suppliers}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Active</div>
                            <div className="text-2xl font-bold text-[#ff1a1a]">{stats.active_suppliers}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Inactive</div>
                            <div className="text-2xl font-bold text-gray-400">{stats.inactive_suppliers}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <div className="text-xs font-medium text-gray-500 mb-1.5">With Items</div>
                            <div className="text-2xl font-bold text-blue-600">{stats.suppliers_with_items}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Without Items</div>
                            <div className="text-2xl font-bold text-orange-600">{stats.suppliers_without_items}</div>
                        </div>
                    </div>

                    {/* Filters */}
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
                                    placeholder="Search suppliers..."
                                />
                            </div>
                            <div className="flex items-center">
                                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all text-sm"
                                >
                                    <option value="All">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Suppliers Table */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Address</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="h-6 w-6 text-[#ff1a1a] animate-spin" />
                                                </div>
                                                <p className="mt-2 text-gray-500 text-sm">Loading suppliers...</p>
                                            </td>
                                        </tr>
                                    ) : suppliers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Truck className="h-10 w-10 text-gray-300 mb-3" />
                                                    <p className="text-gray-500 text-sm">No suppliers found</p>
                                                    <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        suppliers.map((supplier) => (
                                            <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#ff1a1a] flex items-center justify-center shadow-md">
                                                            <Building2 className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-semibold text-gray-900">{supplier.name}</div>
                                                            {supplier.contact_person && (
                                                                <div className="text-xs text-gray-500">Contact: {supplier.contact_person}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        {supplier.email && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                                                {supplier.email}
                                                            </div>
                                                        )}
                                                        {supplier.phone && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                                                {supplier.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center text-sm text-gray-900 max-w-xs">
                                                        <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{supplier.address || 'No address'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getStatusBadge(supplier.status)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                    {supplier.inventory_items_count || 0} items
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(supplier.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="flex justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleEditSupplier(supplier)}
                                                            className="p-1.5 text-[#ff1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Edit Supplier"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConfirm(supplier)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Supplier"
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

                    <SupplierModal
                        isOpen={showSupplierModal}
                        onClose={() => {
                            setShowSupplierModal(false);
                            setSelectedSupplier(null);
                        }}
                        supplier={selectedSupplier}
                        onSave={handleSaveSupplier}
                    />
                    
                    <DeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedSupplier(null);
                        }}
                        onConfirm={handleDeleteSupplier}
                        supplierName={selectedSupplier?.name || ''}
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