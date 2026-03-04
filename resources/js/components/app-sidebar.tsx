import { useState } from 'react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Users, Settings, Trash2, Recycle, Calendar, ClipboardCheck, MapPin, BarChart2, BellRing, CreditCard, FileText, ShoppingCart, Package, TrendingUp, Calculator, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import AppLogo from './app-logo';

// Define the theme colors
const themeColors = {
  primary: ' #ff1a1a',
  lightBg: '#E6FFE6',
};

// Extended NavItem type that includes submenu items
interface NavItemWithSubmenu extends NavItem {
  submenu?: NavItem[];
  open?: boolean;
}

// Dropdown Menu Item Component
const DropdownMenuItem = ({ item, isActive }: { item: NavItemWithSubmenu, isActive: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const activeStyles = isActive ? 
    "bg-[#E6FFE6] text-[#ff1a1a]" : 
    "text-gray-700 hover:text-[#ff1a1a]";

  // If there's no submenu, render a regular link
  if (!item.submenu || item.submenu.length === 0) {
    return (
      <Link
        href={item.href}
        className={`flex items-center py-2 px-4 rounded-md ${activeStyles}`}
      >
        {item.icon && <item.icon className="mr-2 h-5 w-5" />}
        <span>{item.title}</span>
      </Link>
    );
  }

  // Render a dropdown menu
  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className={`flex items-center justify-between w-full py-2 px-4 rounded-md ${activeStyles}`}
      >
        <div className="flex items-center">
          {item.icon && <item.icon className="mr-2 h-5 w-5" />}
          <span>{item.title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="ml-6 mt-1 space-y-1">
          {item.submenu.map((subItem, index) => (
            <Link
              key={index}
              href={subItem.href}
              className="flex items-center py-2 px-4 rounded-md text-gray-700 hover:text-[#ff1a1a] hover:bg-[#E6FFE6]"
            >
              {subItem.icon && <subItem.icon className="mr-2 h-5 w-5" />}
              <span>{subItem.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const userRole = auth.user?.role;

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
                title: 'Point of Sale',
                href: '/admin/pos',
                icon: ShoppingCart,
            },
            {
                title: 'Inventory Management',
                href: '/admin/inventory',
                icon: Package,
                submenu: [
                    {
                        title: 'All Items',
                        href: '/admin/inventory',
                    },
                    {
                        title: 'Categories',
                        href: '/admin/inventory/categories',
                    },
                    {
                        title: 'Stock Count',
                        href: '/admin/inventory/stock-count',
                    },
                    {
                        title: 'Suppliers',
                        href: '/admin/inventory/suppliers',
                    }
                ]
            },
            {
                title: 'Sales Analytics',
                href: '/admin/analytics',
                icon: BarChart2,
                submenu: [
                    {
                        title: 'Sales Overview',
                        href: '/admin/analytics',
                    },
                    {
                        title: 'Products Performance',
                        href: '/admin/analytics/products',
                    },
                    {
                        title: 'Reports',
                        href: '/admin/analytics/reports',
                    }
                ]
            },
            {
                title: 'Forecasting',
                href: '/admin/forecast',
                icon: TrendingUp,
            },
            {
                title: 'Decision Support',
                href: '/admin/dss',
                icon: Calculator,
            },
            {
                title: 'User Management',
                href: '/admin/users',
                icon: Users,
            },
            {
                title: 'Billing & Finances',
                href: '/pos/billing',
                icon: DollarSign,
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
                        href: '/staff/inventory/stock-count',
                    }
                ]
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

    // Custom styles for the exact color theme
    const sidebarStyle = {
        borderColor: themeColors.primary,
    };

    return (
        <Sidebar 
            collapsible="icon" 
            variant="inset" 
            className="bg-white border-r dark:bg-gray-900"
            style={sidebarStyle}
        >
            <SidebarHeader className="border-b" style={sidebarStyle}>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="py-4">
                            <Link 
                                href={
                                    userRole === 'admin'
                                        ? '/pos/admin/dashboard'
                                        : userRole === 'staff'
                                            ? '/pos/staff/dashboard'
                                            : '/dashboard'
                                } 
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <div className="p-4">
                    {mainNavItems.map((item, index) => (
                        <div key={index} className="mb-1">
                            <DropdownMenuItem 
                                item={item} 
                                isActive={false} // You'd need to implement logic to determine active state
                            />
                        </div>
                    ))}
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t" style={sidebarStyle}>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}