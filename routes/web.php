<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

    // User Management API Routes

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Default dashboard
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $user = Auth::user();
        
        if ($user->role === 'admin' ) {
            return redirect()->route('admin.dashboard');
        } elseif ($user->role === 'staff') {
            return redirect()->route('staff.dashboard');
        } 
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // Admin dashboard
    Route::get('admin/dashboard', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Dashboard');
    })->name('admin.dashboard');

    // Admin Route
    Route::get('admin/pos', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Point of Sale');
    })->name('admin.pos');

    // Purchase List Route - New
    Route::get('admin/purchases', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/PurchaseList');
    })->name('admin.purchases');

    Route::get('admin/inventory', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Inventory');
    })->name('admin.inventory');

    Route::get('admin/product details', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Product Details');
    })->name('admin.product details');
    
    Route::get('admin/stock count', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Stock Count');
    })->name('admin.stock count');

    // NEW: Batch Expiration Route for Admin
    Route::get('admin/batch-expiration', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/BatchExpiration');
    })->name('admin.batch-expiration');

    Route::get('admin/categories', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Categories');
    })->name('admin.categories');

    Route::get('admin/suppliers', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Suppliers');
    })->name('admin.suppliers');


    Route::get('/admin/delivery', function () {
        return Inertia::render('Admin/DeliveryManagement');
    })->middleware(['auth']);


    Route::get('admin/forecasting', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Forecasting');
    })->name('admin.forecasting');

    Route::get('admin/users', function () {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Admin/Users');
    })->name('admin.users');

    // ============== STAFF ROUTES ==============
    
    // Staff dashboard
    Route::get('staff/dashboard', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/Dashboard');
    })->name('staff.dashboard');

    // Staff POS Access - FIXED URL TO MATCH HEADER
    Route::get('staff/sale', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/Point of Sale');
    })->name('staff.sale');

    // Staff Inventory Access - NEW ROUTE
    Route::get('staff/inventory', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/Inventory');
    })->name('staff.inventory');

    // Staff Stock Count Access - NEW ROUTE
    Route::get('staff/inventory/stock count', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/Stock Count');
    })->name('staff.stock-count');

    // NEW: Batch Expiration Route for Staff
    Route::get('staff/batch-expiration', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/BatchExpiration');
    })->name('staff.batch-expiration');

    // Staff Purchase List Access 
    Route::get('staff/purchases', function () {
        $user = Auth::user();
        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Staff/PurchaseList');
    })->name('staff.purchases');

    // BACKUP: Keep old staff/pos route for compatibility
    Route::get('staff/pos', function () {
        return redirect()->route('staff.sale');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/api.php';