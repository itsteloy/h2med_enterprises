import AppLayout from '@/layouts/app-layout';
import {  Search, PlusCircle, RefreshCw, Download, Edit, Trash2, Mail, Phone, Filter, X, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { userService, User, UserStats, PaginationData, UserFormData } from '../../../services/userServices';

const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
        'admin': "bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white shadow-sm border border-red-300",
        'staff': "bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm border border-blue-300"
    };
    
    return (
        <span className={`${styles[role]} text-xs font-bold px-2 py-0.5 rounded-full capitalize`}>
            {role}
        </span>
    );
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'active': "bg-gradient-to-r from-green-400 to-green-500 text-white shadow-sm border border-green-300",
        'inactive': "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm border border-gray-300"
    };
    
    return (
        <span className={`${styles[status]} text-xs font-bold px-2 py-0.5 rounded-full capitalize`}>
            {status}
        </span>
    );
};

const UserModal = ({ 
    isOpen, 
    onClose, 
    user, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    user?: User | null; 
    onSave: (userData: UserFormData) => void; 
}) => {
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        phone: '',
        role: 'staff',
        status: 'active',
        password: '',
        password_confirmation: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || 'staff',
                status: user.status || 'active',
                password: '',
                password_confirmation: ''
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: 'staff',
                status: 'active',
                password: '',
                password_confirmation: ''
            });
        }
    }, [user, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-lg max-h-[90vh] transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all flex flex-col">
                <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">
                            {user ? 'Edit User' : 'Add New User'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="space-y-3">
                        {/* NAME */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                            />
                        </div>

                        {/* PHONE */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                            />
                        </div>

                        {/* ROLE & STATUS */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                    value={formData.role}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            role: e.target.value as 'admin' | 'staff',
                                        })
                                    }
                                >
                                    <option value="staff">Staff</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as
                                                | 'active'
                                                | 'inactive',
                                        })
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Password{' '}
                                {user && (
                                    <span className="text-gray-500 font-normal">
                                        (leave blank to keep current)
                                    </span>
                                )}
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required={!user}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a]"
                                value={formData.password_confirmation}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        password_confirmation: e.target.value,
                                    })
                                }
                                required={!user}
                            />
                        </div>
                    </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t bg-white sticky bottom-0 p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:from-[#ff3333] hover:to-[#ff4444]"
                        >
                            {user ? 'Update' : 'Create'} User
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
    userName 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    userName: string; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                
                <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                    <div className="bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] px-4 py-3">
                        <h2 className="text-lg font-bold text-white">Delete User</h2>
                    </div>
                    
                    <div className="p-4">
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete <strong className="text-gray-900">{userName}</strong>? This action cannot be undone.
                        </p>
                        
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:from-[#ff3333] hover:to-[#ff4444] transition-all font-medium shadow-lg"
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
        ? 'bg-gradient-to-r from-[#ff1a1a] to-[#ff3333]' 
        : 'bg-gradient-to-r from-red-500 to-red-600';
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
            <div className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                    <div className="font-medium">{message}</div>
                    <button 
                        onClick={onClose}
                        className="ml-3 rounded-full p-1 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats>({
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        suspended_users: 0,
        admin_users: 0,
        staff_users: 0
    });
    const [pagination, setPagination] = useState<PaginationData>({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page,
                per_page: pagination.per_page,
                ...(searchTerm && { search: searchTerm }),
                ...(roleFilter !== 'All' && { role: roleFilter.toLowerCase() }),
                ...(statusFilter !== 'All' && { status: statusFilter.toLowerCase() })
            };

            const response = await userService.getUsers(params);
            setUsers(response.data);
            setPagination(response.pagination);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, [pagination.per_page, searchTerm, roleFilter, statusFilter]);

    const fetchStats = async () => {
        try {
            const response = await userService.getUserStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSaveUser = async (userData: UserFormData) => {
        try {
            // Validate password confirmation
            if (userData.password && userData.password !== userData.password_confirmation) {
                showNotification('error', 'Password confirmation does not match');
                return;
            }

            // Check if name already exists (case-insensitive)
            if (!selectedUser || (selectedUser && selectedUser.name.toLowerCase() !== userData.name.toLowerCase())) {
                const nameExists = users.some(user => 
                    user.name.toLowerCase() === userData.name.toLowerCase() && 
                    (!selectedUser || user.id !== selectedUser.id)
                );
                
                if (nameExists) {
                    showNotification('error', 'A user with this name already exists');
                    return;
                }
            }

            // Check if email already exists (case-insensitive)
            if (!selectedUser || (selectedUser && selectedUser.email.toLowerCase() !== userData.email.toLowerCase())) {
                const emailExists = users.some(user => 
                    user.email.toLowerCase() === userData.email.toLowerCase() && 
                    (!selectedUser || user.id !== selectedUser.id)
                );
                
                if (emailExists) {
                    showNotification('error', 'A user with this email already exists');
                    return;
                }
            }

            // Check if phone already exists (if phone is provided)
            if (userData.phone && (!selectedUser || (selectedUser && selectedUser.phone !== userData.phone))) {
                const phoneExists = users.some(user => 
                    user.phone === userData.phone && 
                    (!selectedUser || user.id !== selectedUser.id)
                );
                
                if (phoneExists) {
                    showNotification('error', 'A user with this phone number already exists');
                    return;
                }
            }

            let response;
            
            if (selectedUser) {
                response = await userService.updateUser(selectedUser.id, userData);
            } else {
                response = await userService.createUser(userData);
            }

            showNotification('success', response.message || `User ${selectedUser ? 'updated' : 'created'} successfully`);
            setShowUserModal(false);
            setSelectedUser(null);
            fetchUsers(pagination.current_page);
            fetchStats();
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to save user');
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        
        try {
            const response = await userService.deleteUser(selectedUser.id);
            showNotification('success', response.message || 'User deleted successfully');
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers(pagination.current_page);
            fetchStats();
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Failed to delete user');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [fetchUsers]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchUsers(1);
        }, 500);
        
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, roleFilter, statusFilter, fetchUsers]);

    const handlePageChange = (page: number) => {
        fetchUsers(page);
    };

    const handleExport = () => {
        try {
            generatePDF();
            showNotification('success', 'Users PDF exported successfully');
        } catch {
            showNotification('error', 'Failed to export users data');
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
                <title>Users Report</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 15mm;
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
                        border-bottom: 3px solid #00c951;
                        margin-bottom: 20px;
                    }
                    
                    .header h1 {
                        color: #00c951;
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
                        border: 2px solid #00c951;
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
                        color: #00c951;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                        font-size: 8pt;
                    }
                    
                    thead {
                        background: #00c951;
                        color: white;
                    }
                    
                    th {
                        padding: 8px 6px;
                        text-align: left;
                        font-size: 8pt;
                        font-weight: bold;
                        border: 1px solid #00a642;
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
                        border-top: 2px solid #00c951;
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
                        color: #00c951;
                    }
                    
                    .role-badge {
                        display: inline-block;
                        padding: 3px 10px;
                        border-radius: 10px;
                        font-size: 7pt;
                        font-weight: bold;
                        text-transform: capitalize;
                    }
                    
                    .role-admin {
                        background: #fef3c7;
                        color: #92400e;
                    }
                    
                    .role-manager {
                        background: #dbeafe;
                        color: #1e3a8a;
                    }
                    
                    .role-cashier {
                        background: #dcfce7;
                        color: #166534;
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
                        color: #166534;
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
                        <h1>USERS REPORT</h1>
                        <div class="subtitle">Complete list of system users</div>
                        <div class="report-info">
                            <div><strong>Report Date:</strong> ${currentDate}</div>
                            <div><strong>Total Users:</strong> ${users.length}</div>
                            <div><strong>Role:</strong> ${roleFilter === 'all' ? 'All Roles' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}</div>
                        </div>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Total Users</div>
                            <div class="value">${users.length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Active Users</div>
                            <div class="value">${users.filter(u => u.status === 'active').length}</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Admins</div>
                            <div class="value">${users.filter(u => u.role === 'admin').length}</div>
                        </div>
                    </div>
                    
                    ${users.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 4%;">#</th>
                                    <th style="width: 18%;">Name</th>
                                    <th style="width: 15%;">Username</th>
                                    <th style="width: 18%;">Email</th>
                                    <th style="width: 12%;">Phone</th>
                                    <th style="width: 10%;">Role</th>
                                    <th style="width: 8%;">Status</th>
                                    <th style="width: 15%;">Last Login</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map((user, index) => `
                                    <tr>
                                        <td style="text-align: center;">${index + 1}</td>
                                        <td><strong>${user.name}</strong></td>
                                        <td>${user.name}</td>
                                        <td style="font-size: 7pt;">${user.email}</td>
                                        <td>${user.phone || '-'}</td>
                                        <td>
                                            <span class="role-badge role-${user.role}">
                                                ${user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status-badge status-${user.status}">
                                                ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                            </span>
                                        </td>
                                        <td style="font-size: 7pt;">-</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="no-data">
                            <p>✓ No users found</p>
                        </div>
                    `}
                    
                    <div class="footer">
                        <div class="footer-content">
                            <div class="footer-left">
                                <div><strong>Pharmacy Inventory System</strong></div>
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

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setShowUserModal(true);
    };

    const handleDeleteConfirm = (user: User) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;
        
        const pages = [];
        const maxPages = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxPages / 2));
        const endPage = Math.min(pagination.last_page, startPage + maxPages - 1);
        
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
                        'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 
                        'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return (
            <div className="flex justify-center items-center mt-6 space-x-2">
                <button 
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                    Previous
                </button>
                
                {pages}
                
                <button 
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-[#dcfce7] border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                                <p className="text-gray-600 mt-1">Manage your team members and their permissions</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => {
                                    setSelectedUser(null);
                                    setShowUserModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#ff3333] text-white rounded-lg hover:from-[#ff3333] hover:to-[#ff4444] transition-all shadow-lg font-medium"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add User
                            </button>
                            <button 
                                onClick={handleExport}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm font-medium"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </button>
                            <button 
                                onClick={() => {
                                    fetchUsers(pagination.current_page);
                                    fetchStats();
                                }}
                                className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Total Users</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Active Users</div>
                            <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Inactive Users</div>
                            <div className="text-2xl font-bold text-gray-600">{stats.inactive_users}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Admin Users</div>
                            <div className="text-2xl font-bold text-[#ff1a1a]">{stats.admin_users}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Staff Users</div>
                            <div className="text-2xl font-bold text-[#ff1a1a]">{stats.staff_users}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all"
                                    placeholder="Search users..."
                                />
                            </div>
                            <div className="flex items-center">
                                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all"
                                >
                                    <option value="All">All Roles</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <Filter className="h-4 w-4 text-gray-400 mr-2" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff1a1a] focus:border-transparent transition-all"
                                >
                                    <option value="All">All Status</option>
                                    <option value="active">Active</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Last Activity</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <RefreshCw className="h-6 w-6 text-[#ff1a1a] animate-spin" />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-lg font-medium">No users found</p>
                                                    <p className="text-sm">Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#ff1a1a] flex items-center justify-center shadow-lg">
                                                            <span className="text-white font-bold text-sm">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                                            {user.email}
                                                        </div>
                                                        {user.phone && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                                                {user.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getRoleBadge(user.role)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getStatusBadge(user.status)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="flex justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="p-1 text-[#ff1a1a] hover:bg-[#dcfce7] rounded-lg transition-colors"
                                                            title="Edit User"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConfirm(user)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete User"
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

                    <UserModal
                        isOpen={showUserModal}
                        onClose={() => {
                            setShowUserModal(false);
                            setSelectedUser(null);
                        }}
                        user={selectedUser}
                        onSave={handleSaveUser}
                    />
                    
                    <DeleteModal
                        isOpen={showDeleteModal}
                        onClose={() => {
                            setShowDeleteModal(false);
                            setSelectedUser(null);
                        }}
                        onConfirm={handleDeleteUser}
                        userName={selectedUser?.name || ''}
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