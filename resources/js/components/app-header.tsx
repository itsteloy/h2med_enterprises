import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { 
    LayoutGrid, 
    Users, 
    ShoppingCart, 
    Package, 
    TrendingUp, 
    Receipt, 
    List,
    ChevronDown, 
    ChevronRight,
    Menu, 
    X,
    Bell,
    User,
    AlertTriangle,
    Clock,
    Barcode
} from 'lucide-react';
import AppLogo from './app-logo';
import { type NavItem } from '@/types';

// Define the theme colors
const themeColors = {
  primary: '#ff1a1a',
  lightBg: '#ffe6e6',
  hoverBg: '#ffcccc',
  darkGreen: '#cc0000',
};

// Notification type definition
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
  timestamp: Date; // Add timestamp for sorting
}

// Extended NavItem type that includes submenu items
interface NavItemWithSubmenu extends NavItem {
  submenu?: NavItem[];
  open?: boolean;
}

// Dropdown Menu Item Component
const DropdownMenuItem = ({ 
    item, 
    isActive, 
    isMobile = false,
    closeDropdowns
}: { 
    item: NavItemWithSubmenu, 
    isActive: boolean,
    isMobile?: boolean,
    closeDropdowns: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mobile styles are different from desktop
  const baseStyles = isMobile 
    ? "text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors duration-200" 
    : "text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors duration-200";
  
  const activeStyles = isActive
    ? 'bg-[#ffe6e6] text-[#ff1a1a] font-medium'
    : baseStyles;

  // If there's no submenu, render a regular link
  if (!item.submenu || item.submenu.length === 0) {
    return (
      <Link
        href={item.href}
        className={`flex items-center py-2 px-3 rounded-md ${activeStyles} ${isMobile ? 'w-full' : ''}`}
        onClick={closeDropdowns}
      >
        {item.icon && <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />}
        <span className="truncate">{item.title}</span>
      </Link>
    );
  }

  // Render a dropdown menu
  return (
    <div className={`relative ${isMobile ? 'w-full' : ''}`} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`flex items-center justify-between py-2 px-3 rounded-md w-full ${activeStyles}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center">
          {item.icon && <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />}
          <span className="truncate">{item.title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
        )}
      </button>
      
      {isOpen && (
        <div className={`
          ${isMobile ? 'ml-6 mt-1 space-y-1' : 'absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 min-w-[200px]'}
          transition-all duration-200 ease-in-out
        `}>
          {item.submenu.map((subItem, index) => (
            <Link
              key={index}
              href={subItem.href}
              className={`
                flex items-center py-2 px-4 
                ${isMobile ? 'rounded-md hover:bg-[#E6FFE6]' : 'hover:bg-[#E6FFE6]'} 
                text-gray-700 hover:text-[#00A650]
                ${isMobile ? '' : 'block w-full first:rounded-t-md last:rounded-b-md'}
                transition-colors duration-150
              `}
              onClick={closeDropdowns}
            >
              {subItem.icon && <subItem.icon className="mr-2 h-5 w-5 flex-shrink-0" />}
              <span className="truncate">{subItem.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export function AppHeader() {
    const page = usePage();
    const auth = (page.props as { auth?: { user?: { role?: string; name?: string; email?: string; avatar?: string } } }).auth;
    const userRole = auth?.user?.role;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationError, setNotificationError] = useState(false);
    
    const closeAllDropdowns = () => {
      setMobileMenuOpen(false);
      setUserMenuOpen(false);
      setNotificationsOpen(false);
    };

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        setLoadingNotifications(true);
        setNotificationError(false);
        try {
            const response = await fetch('/api/dashboard/overview');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            
            const data = await response.json();
            
            if (data.success) {
                const alerts = data.data.alerts;
                const notificationsList: NotificationItem[] = [];
                
                // Add out of stock notifications
                if (alerts.out_of_stock_items && alerts.out_of_stock_items.length > 0) {
                    alerts.out_of_stock_items.forEach((item: { id: number; name: string; sku: string; category?: { name: string }; updated_at: string }) => {
                        notificationsList.push({
                            id: `out-of-stock-${item.id}`,
                            type: 'out_of_stock',
                            title: `Out of stock: ${item.name}`,
                            message: `0 ${item.category?.name || 'items'} remaining - Reorder needed`,
                            time: 'Stock Alert',
                            icon: AlertTriangle,
                            color: 'text-red-600',
                            href: `/admin/inventory?search=${item.sku}`,
                            timestamp: new Date(item.updated_at)
                        });
                    });
                }

                // Add low stock notifications (exclude items with 0 stock)
                if (alerts.low_stock_items && alerts.low_stock_items.length > 0) {
                    alerts.low_stock_items
                        .filter((item: { stock_quantity: number }) => item.stock_quantity > 0)
                        .forEach((item: { id: number; name: string; sku: string; stock_quantity: number; category?: { name: string }; updated_at: string }) => {
                            notificationsList.push({
                                id: `low-stock-${item.id}`,
                                type: 'low_stock',
                                title: `Low stock: ${item.name}`,
                                message: `Only ${item.stock_quantity} ${item.category?.name || 'items'} remaining`,
                                time: 'Stock Alert',
                                icon: AlertTriangle,
                                color: 'text-orange-600',
                                href: `/admin/inventory?search=${item.sku}`,
                                timestamp: new Date(item.updated_at)
                            });
                        });
                }

                // Add expiring items notifications
                if (alerts.expiring_soon && alerts.expiring_soon.length > 0) {
                    alerts.expiring_soon.forEach((item: { id: number; name: string; sku: string; expiry_date: string; created_at: string }) => {
                        notificationsList.push({
                            id: `expiring-${item.id}`,
                            type: 'expiring',
                            title: `Expiring soon: ${item.name}`,
                            message: `Expires on ${new Date(item.expiry_date).toLocaleDateString()}`,
                            time: 'Expiry Alert',
                            icon: Clock,
                            color: 'text-red-600',
                            href: `/admin/batch-expiration?search=${item.sku}`,
                            timestamp: new Date(item.created_at || item.expiry_date)
                        });
                    });
                }

                // Add missing barcode notifications
                if (alerts.missing_barcodes && alerts.missing_barcodes.length > 0) {
                    const count = alerts.missing_barcodes.length;
                    const mostRecent = alerts.missing_barcodes[0];
                    notificationsList.push({
                        id: 'missing-barcodes',
                        type: 'missing_barcode',
                        title: `${count} items without barcodes`,
                        message: 'Consider generating barcodes for inventory tracking',
                        time: 'System Alert',
                        icon: Barcode,
                        color: 'text-blue-600',
                        href: '/admin/batch-expiration?status=no_barcode',
                        timestamp: new Date(mostRecent?.created_at || Date.now())
                    });
                }

                // Sort all notifications by timestamp (newest first)
                notificationsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                setNotifications(notificationsList);
                setNotificationCount(notificationsList.length);
            } else {
                throw new Error(data.message || 'Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotificationError(true);
            // Keep previous notifications if any, don't clear them on error
            if (notifications.length === 0) {
                setNotifications([]);
                setNotificationCount(0);
            }
        } finally {
            setLoadingNotifications(false);
        }
    }, [notifications.length]);

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Handle scroll effect for header
    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            setScrolled(isScrolled);
        };

        document.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            document.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Fetch notifications on mount and set up periodic refresh
    useEffect(() => {
        // Fetch notifications on mount
        fetchNotifications();
        
        // Set up periodic refresh every 60 seconds
        const notificationInterval = setInterval(fetchNotifications, 60000);
        
        return () => {
            clearInterval(notificationInterval);
        };
    }, [fetchNotifications]);

    // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
          setUserMenuOpen(false);
        }
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
          setNotificationsOpen(false);
        }
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && 
            !(event.target as HTMLElement).closest('[aria-label="Mobile menu button"]')) {
          setMobileMenuOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Logout function
    const handleLogout = () => {
      router.post('/logout');
      setUserMenuOpen(false);
    };

    // Define navigation items based on user role
    let mainNavItems: NavItemWithSubmenu[] = [];
    
    // Admin navigation items with dropdowns
    if (userRole === 'admin') {
    mainNavItems = [
        {
            title: 'Dashboard',
            href: '/admin/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'POS',
            href: '/admin/pos',
            icon: ShoppingCart,
        },
        {
            title: 'Inventory',
            href: '/admin/inventory',
            icon: Package,
            submenu: [
                {
                    title: 'Items',
                    href: '/admin/inventory',
                }, 
                {
                    title: 'Categories',
                    href: '/admin/categories',
                },
                {
                    title: 'Stock Count',
                    href: '/admin/stock count',
                },
                 {
                    title: 'Batch Expiration', 
                    href: '/admin/batch-expiration',
                },
                {
                    title: 'Suppliers',
                    href: '/admin/suppliers',
                },

                {
                    title: 'Delivery Management',
                    href: '/admin/delivery'
                }
            ]
        },
        {
            title: 'Purchase List',
            href: '/admin/purchases',
            icon: List,
        },
        {
            title: 'Forecasting',
            href: '/admin/forecasting',
            icon: TrendingUp,
        },
        {
            title: 'Users',
            href: '/admin/users',
            icon: Users,
        },
    ];
    } 
    // Staff navigation items
    else if (userRole === 'staff') {
        mainNavItems = [
            {
                title: 'Dashboard',
                href: '/staff/dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'Point of Sale',
                href: '/staff/sale',
                icon: ShoppingCart,
            },
            {
                title: 'Inventory',
                href: '/staff/inventory',
                icon: Package,
                submenu: [
                    {
                        title: 'All Items',
                        href: '/staff/inventory',
                    },
                    {
                        title: 'Stock Count',
                        href: '/staff/inventory/stock count',
                    },
                     {
                    title: 'Batch Expiration',  
                    href: '/staff/batch-expiration',
                }
                ]
            },
            {
                title: 'Purchase List',
                href: '/staff/purchases',
                icon: Receipt,
            },
        ];
    }
    // Default navigation items (fallback)
    else {
        mainNavItems = [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
            },
        ];
    }

    return (
        <header className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Mobile Menu Button */}
                    <div className="flex items-center">
                        {/* Mobile menu button - only visible on small screens */}
                        <div className="mr-2 flex md:hidden">
                            <button
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Mobile menu button"
                                aria-expanded={mobileMenuOpen}
                            >
                                {mobileMenuOpen ? (
                                    <X className="block h-6 w-6" />
                                ) : (
                                    <Menu className="block h-6 w-6" />
                                )}
                            </button>
                        </div>
                        
                        {/* Logo */}
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <AppLogo />
                        </Link>
                    </div>

                    {/* Desktop Navigation - hidden on mobile */}
                    <nav className="hidden md:flex md:items-center md:space-x-1">
                        {mainNavItems.map((item, index) => (
                            <DropdownMenuItem 
                                key={index} 
                                item={item} 
                                isActive={window.location.pathname === item.href}
                                closeDropdowns={closeAllDropdowns}
                            />
                        ))}
                    </nav>

                    {/* Right Side Icons - Notifications & User Menu */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Notifications */}
                        <div className="relative" ref={notificationsRef}>
                            <button 
                                className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                onClick={() => {
                                    setNotificationsOpen(!notificationsOpen);
                                    setUserMenuOpen(false);
                                }}
                                aria-label="Notifications"
                                aria-expanded={notificationsOpen}
                            >
                                <Bell className="h-6 w-6" />
                                {notificationCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {notificationsOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-gray-100">
                                    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <p className="text-sm font-medium text-gray-700">Notifications</p>
                                        <div className="flex items-center space-x-2">
                                            {notificationCount > 0 && (
                                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                    {notificationCount}
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fetchNotifications();
                                                }}
                                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                                title="Refresh notifications"
                                                disabled={loadingNotifications}
                                            >
                                                <svg 
                                                    className={`h-4 w-4 ${loadingNotifications ? 'animate-spin' : ''}`} 
                                                    fill="none" 
                                                    viewBox="0 0 24 24" 
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {loadingNotifications ? (
                                            <div className="px-4 py-8 text-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div>
                                                <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                                            </div>
                                        ) : notificationError ? (
                                            <div className="px-4 py-8 text-center">
                                                <AlertTriangle className="h-8 w-8 text-red-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500 mb-3">Failed to load notifications</p>
                                                <button
                                                    onClick={fetchNotifications}
                                                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : notifications.length > 0 ? (
                                            notifications.map((notification) => (
                                                <Link
                                                    key={notification.id}
                                                    href={notification.href}
                                                    className="block px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                    onClick={() => setNotificationsOpen(false)}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <notification.icon className={`h-5 w-5 mt-0.5 ${notification.color}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {notification.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No new notifications</p>
                                                <p className="text-xs text-gray-400 mt-1">All systems running smoothly!</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 bg-gray-50 text-center">
                                        <Link 
                                            href="/staff/dashboard" 
                                            className="text-sm font-medium text-red-600 hover:text-red-700"
                                            onClick={() => setNotificationsOpen(false)}
                                        >
                                            View dashboard for more details
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button 
                                className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                onClick={() => {
                                    setUserMenuOpen(!userMenuOpen);
                                    setNotificationsOpen(false);
                                }}
                                aria-label="User menu"
                                aria-expanded={userMenuOpen}
                            >
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {auth?.user?.avatar ? (
                                        <img 
                                            src={auth.user.avatar} 
                                            alt="User avatar" 
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-5 w-5 text-gray-500" />
                                    )}
                                </div>
                                <span className="ml-2 text-gray-700 hidden sm:block truncate max-w-[120px]">
                                    {auth?.user?.name || 'User'}
                                </span>
                                <ChevronDown className={`ml-1 h-4 w-4 text-gray-500 hidden sm:block transition-transform duration-200 ${userMenuOpen ? 'transform rotate-180' : ''}`} />
                            </button>

                            {/* User Dropdown */}
                            {userMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-gray-100">
                                    <div className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-900 truncate">{auth?.user?.name || 'User'}</p>
                                        <p className="text-xs text-gray-500 truncate">{auth?.user?.email || ''}</p>
                                    </div>
                                    <div className="py-1">
                                        <Link 
                                            href="/settings/profile" 
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            Your Profile
                                        </Link>
                                        <Link 
                                            href="/settings" 
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            Settings
                                        </Link>
                                    </div>
                                    <div className="py-1">
                                        <button 
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={handleLogout}
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={`md:hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`} ref={mobileMenuRef}>
                <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3 bg-white shadow-md">
                    {mainNavItems.map((item, index) => (
                        <div key={index} className="mb-1">
                            <DropdownMenuItem 
                                item={item} 
                                isActive={window.location.pathname === item.href} 
                                isMobile={true}
                                closeDropdowns={closeAllDropdowns}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </header>
    );
}