<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ForecastingController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\DeliveryController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::middleware(['auth'])->group(function () {
    
    // ============================================================
    // USER MANAGEMENT ROUTES
    // DEFENSE MINUTES FIX: Status removed from creation
    // ============================================================
    Route::prefix('api/users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']); // No status required
        Route::get('/stats', [UserController::class, 'stats']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']); // Status can be updated
        Route::delete('/{id}', [UserController::class, 'destroy']);
    });

    // ============================================================
    // INVENTORY MANAGEMENT ROUTES
    // DEFENSE MINUTES FIX: Added out-of-stock and expired items endpoints
    // ============================================================
    Route::prefix('api/inventory')->group(function () {
        // CRITICAL: Place ALL specific routes BEFORE parameterized routes
        Route::get('/stats', [InventoryController::class, 'stats']);
        Route::get('/low-stock', [InventoryController::class, 'lowStockItems']);
        Route::get('/export', [InventoryController::class, 'export']);
        
        // DEFENSE MINUTES FIX: New endpoints
        Route::get('/out-of-stock-notifications', [InventoryController::class, 'outOfStockNotifications']);
        Route::get('/expired-items', [InventoryController::class, 'expiredItems']);
        Route::get('/available-stock', [InventoryController::class, 'availableStock']);
        
        // Batch expiration routes - MUST come before /{id}
        Route::get('/batch-expiration', [InventoryController::class, 'checkBatchExpiration']);
        Route::get('/batch-expiration/export', [InventoryController::class, 'exportBatchExpiration']);
        
        // Purchase list and other specific routes
        Route::get('/purchase-list', [InventoryController::class, 'generatePurchaseList']);
        Route::get('/development-roadmap', [InventoryController::class, 'getDevelopmentRoadmap']);
        Route::post('/bulk-generate-barcodes', [InventoryController::class, 'bulkGenerateBarcodes']);
        Route::get('/reference-numbers', [InventoryController::class, 'getAvailableReferenceNumbers']);
        Route::post('/bulk-update', [InventoryController::class, 'bulkUpdate']);
        Route::get('/validate-category/{categoryId}', [InventoryController::class, 'validateCategoryUsage']);
        
        // Main inventory routes
        Route::get('/', [InventoryController::class, 'index']);
        Route::post('/', [InventoryController::class, 'store']);
        
        // Parameterized routes - MUST come LAST
        Route::get('/{id}', [InventoryController::class, 'show']);
        Route::get('/products/{id}', [InventoryController::class, 'show']);
        Route::put('/{id}', [InventoryController::class, 'update']);
        Route::get('/{id}/check-deletion', [InventoryController::class, 'checkDeletion']);
        Route::delete('/{id}', [InventoryController::class, 'destroy']);
        Route::post('/{id}/adjust-stock', [InventoryController::class, 'adjustStock']);
        Route::post('/{id}/generate-barcode', [InventoryController::class, 'generateBarcode']);
        Route::get('/{id}/stock-history', [InventoryController::class, 'stockHistory']);
    });

    // ============================================================
    // CATEGORIES MANAGEMENT ROUTES
    // ============================================================
    Route::prefix('api/categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::get('/stats', [CategoryController::class, 'stats']);
        Route::get('/active', [CategoryController::class, 'getAllActive']);
        Route::get('/{id}', [CategoryController::class, 'show']);
        Route::put('/{id}', [CategoryController::class, 'update']);
        Route::delete('/{id}', [CategoryController::class, 'destroy']);
    });

    // ============================================================
    // SUPPLIERS MANAGEMENT ROUTES
    // ============================================================
    Route::prefix('api/suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::post('/', [SupplierController::class, 'store']);
        Route::get('/stats', [SupplierController::class, 'stats']);
        Route::get('/active', [SupplierController::class, 'getAllActive']);
        Route::get('/low-stock', [SupplierController::class, 'suppliersWithLowStock']);
        Route::get('/search', [SupplierController::class, 'search']);
        Route::get('/export', [SupplierController::class, 'export']);
        Route::post('/bulk-status', [SupplierController::class, 'bulkUpdateStatus']);
        Route::get('/{id}', [SupplierController::class, 'show']);
        Route::put('/{id}', [SupplierController::class, 'update']);
        Route::delete('/{id}', [SupplierController::class, 'destroy']);
        Route::get('/{id}/performance', [SupplierController::class, 'performance']);
    });

    // ============================================================
    // DELIVERY MANAGEMENT ROUTES
    // ============================================================

Route::prefix('api/deliveries')->group(function () {
    Route::get('/', [DeliveryController::class, 'index']);
    Route::post('/', [DeliveryController::class, 'store']);
    Route::get('/{id}', [DeliveryController::class, 'show']);
    Route::put('/{id}', [DeliveryController::class, 'update']);
    Route::delete('/{id}', [DeliveryController::class, 'destroy']);
});
    // ============================================================
    // TRANSACTION MANAGEMENT ROUTES
    // DEFENSE MINUTES FIX: Added cashier stats and filtered export
    // ============================================================
    Route::prefix('api/transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('/', [TransactionController::class, 'processTransaction']);
        Route::get('/stats', [TransactionController::class, 'stats']);
        Route::get('/with-discounts', [TransactionController::class, 'getTransactionsWithDiscounts']);
        Route::get('/export', [TransactionController::class, 'export']);
        
        // DEFENSE MINUTES FIX: New endpoints
        Route::get('/cashier-stats', [TransactionController::class, 'cashierStats']);
        Route::get('/export-filtered', [TransactionController::class, 'exportFiltered']);
        
        Route::get('/{id}', [TransactionController::class, 'show']);
        Route::post('/{id}/void', [TransactionController::class, 'voidTransaction']);
        
        // Discount summary route
        Route::get('/discounts/summary', function(Request $request) {
            try {
                $dateFrom = $request->date_from ?? now()->startOfMonth();
                $dateTo = $request->date_to ?? now()->endOfMonth();
                
                $summary = [
                    'total_discount_transactions' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->where(function($q) {
                            $q->where('is_senior_citizen', true)
                              ->orWhere('is_pwd', true) 
                              ->orWhere('discount_amount', '>', 0);
                        })->count(),
                    'total_discount_amount' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->sum('discount_amount'),
                    'senior_citizen_count' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->where('is_senior_citizen', true)->count(),
                    'pwd_count' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->where('is_pwd', true)->count(),
                    'general_discount_count' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->where('discount_rate', '>', 0)
                        ->where('is_senior_citizen', false)
                        ->where('is_pwd', false)->count(),
                    'average_discount_per_transaction' => \App\Models\Transaction::whereBetween('created_at', [$dateFrom, $dateTo])
                        ->where('discount_amount', '>', 0)
                        ->avg('discount_amount')
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $summary
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to get discount summary',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    });

    // ============================================================
    // REPORTS ROUTES
    // DEFENSE MINUTES FIX: New comprehensive reporting system
    // ============================================================
    Route::prefix('api/reports')->group(function () {
        Route::get('/sales', [ReportsController::class, 'salesReport']);
        Route::get('/inventory', [ReportsController::class, 'inventoryReport']);
        Route::get('/cashier-performance', [ReportsController::class, 'cashierPerformance']);
    });

    // ============================================================
    // FORECASTING MANAGEMENT ROUTES
    // ============================================================
    Route::prefix('api/forecasting')->group(function () {
        // Sales forecasting
        Route::get('/sales', [ForecastingController::class, 'getSalesForecast']);
        Route::post('/sales/generate', [ForecastingController::class, 'getSalesForecast']);
        
        // Inventory forecasting
        Route::get('/inventory', [ForecastingController::class, 'getInventoryForecast']);
        Route::post('/inventory/generate', [ForecastingController::class, 'getInventoryForecast']);
        
        // Demand forecasting
        Route::get('/demand', [ForecastingController::class, 'getDemandForecast']);
        Route::post('/demand/generate', [ForecastingController::class, 'getDemandForecast']);
        
        // Seasonal trends
        Route::get('/seasonal', [ForecastingController::class, 'getSeasonalTrends']);
        
        // AI insights
        Route::get('/insights', [ForecastingController::class, 'getBusinessInsights']);
        Route::post('/insights/generate', [ForecastingController::class, 'generateAIInsights']);
        
        // Forecast accuracy
        Route::get('/accuracy', [ForecastingController::class, 'getForecastAccuracy']);
        
        // Overview
        Route::get('/overview', [ForecastingController::class, 'getOverview']);
        
        // Product-specific forecast
        Route::get('/product/{productId}', [ForecastingController::class, 'getProductForecast']);
        
        // Category forecast
        Route::get('/category/{categoryId}', [ForecastingController::class, 'getCategoryForecast']);
        
        // Export forecasts
        Route::get('/export', [ForecastingController::class, 'exportForecast']);
    });

    // ============================================================
    // POS ROUTES
    // DEFENSE MINUTES FIX: Added cashier-specific stats
    // ============================================================
    Route::prefix('api/pos')->group(function () {
        // Get products for POS (in-stock items only)
        Route::get('/products', function(Request $request) {
            try {
                $query = \App\Models\InventoryItem::where('status', 'active')
                    ->where('stock_quantity', '>', 0);
                
                // Filter out expired items
                $query->where(function($q) {
                    $q->whereNull('expiry_date')
                      ->orWhere('expiry_date', '>', now());
                });
                
                if ($search = $request->input('search')) {
                    $query->where(function($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('sku', 'like', "%{$search}%")
                          ->orWhere('barcode', 'like', "%{$search}%");
                    });
                }
                
                if ($categoryId = $request->input('category_id')) {
                    $query->where('category_id', $categoryId);
                }
                
                $perPage = $request->input('per_page', 50);
                $products = $query->with(['category:id,name', 'supplier:id,name'])
                    ->paginate($perPage);
                
                return response()->json([
                    'success' => true,
                    'data' => $products->items(),
                    'pagination' => [
                        'current_page' => $products->currentPage(),
                        'last_page' => $products->lastPage(),
                        'per_page' => $products->perPage(),
                        'total' => $products->total()
                    ]
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error fetching POS products: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve products',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // Process transaction
        Route::post('/transactions', [TransactionController::class, 'processTransaction']);
        
        // Get recent transactions
        Route::get('/transactions/recent', function(Request $request) {
            try {
                $limit = $request->input('limit', 5);
                $transactions = \App\Models\Transaction::with(['items', 'user'])
                    ->orderBy('created_at', 'desc')
                    ->take($limit)
                    ->get();
                
                return response()->json([
                    'success' => true,
                    'data' => $transactions
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve transactions',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // Get POS statistics
        Route::get('/stats', function(Request $request) {
            try {
                $stats = [
                    'daily_sales' => \App\Models\Transaction::whereDate('created_at', today())
                        ->sum('total'),
                    'transactions_today' => \App\Models\Transaction::whereDate('created_at', today())
                        ->count(),
                    'popular_items' => []
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $stats
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch POS stats',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // DEFENSE MINUTES FIX: Per-cashier statistics
        Route::get('/cashier-stats', function(Request $request) {
            try {
                $userId = $request->user()->id;
                
                $stats = [
                    'daily_sales' => \App\Models\Transaction::where('user_id', $userId)
                        ->whereDate('created_at', today())
                        ->sum('total'),
                    'transactions_today' => \App\Models\Transaction::where('user_id', $userId)
                        ->whereDate('created_at', today())
                        ->count(),
                    'transactions_this_week' => \App\Models\Transaction::where('user_id', $userId)
                        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->count(),
                    'total_transactions' => \App\Models\Transaction::where('user_id', $userId)->count(),
                    'average_transaction' => \App\Models\Transaction::where('user_id', $userId)
                        ->whereDate('created_at', today())
                        ->avg('total')
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $stats
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve cashier statistics',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    });

    // ============================================================
    // STOCK MOVEMENTS ROUTES
    // ============================================================
    Route::prefix('api/stock-movements')->group(function () {
        Route::get('/', function(Request $request) {
            try {
                $query = \App\Models\StockMovement::with(['inventoryItem:id,sku,name,batch_number', 'user:id,name']);
                
                if ($type = $request->input('type')) {
                    $query->where('type', $type);
                }
                
                if ($itemId = $request->input('inventory_item_id')) {
                    $query->where('inventory_item_id', $itemId);
                }
                
                if ($userId = $request->input('user_id')) {
                    $query->where('user_id', $userId);
                }
                
                if ($dateFrom = $request->input('date_from')) {
                    $query->whereDate('created_at', '>=', $dateFrom);
                }
                
                if ($dateTo = $request->input('date_to')) {
                    $query->whereDate('created_at', '<=', $dateTo);
                }
                
                $perPage = $request->input('per_page', 15);
                $movements = $query->orderBy('created_at', 'desc')->paginate($perPage);
                
                return response()->json([
                    'success' => true,
                    'data' => $movements->items(),
                    'pagination' => [
                        'current_page' => $movements->currentPage(),
                        'last_page' => $movements->lastPage(),
                        'per_page' => $movements->perPage(),
                        'total' => $movements->total()
                    ]
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error fetching stock movements: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve stock movements',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        Route::get('/recent', function(Request $request) {
            try {
                $limit = $request->input('limit', 10);
                $movements = \App\Models\StockMovement::with(['inventoryItem:id,sku,name,batch_number', 'user:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->take($limit)
                    ->get();
                
                return response()->json([
                    'success' => true,
                    'data' => $movements
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch recent movements',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        Route::get('/stats', function(Request $request) {
            try {
                $stats = [
                    'total_movements' => \App\Models\StockMovement::count(),
                    'stock_in_today' => \App\Models\StockMovement::where('type', 'in')
                        ->whereDate('created_at', today())
                        ->sum('quantity'),
                    'stock_out_today' => \App\Models\StockMovement::where('type', 'out')
                        ->whereDate('created_at', today())
                        ->sum('quantity'),
                    'adjustments_today' => \App\Models\StockMovement::where('type', 'adjustment')
                        ->whereDate('created_at', today())
                        ->count(),
                    'movements_this_week' => \App\Models\StockMovement::whereBetween('created_at', [
                        now()->startOfWeek(),
                        now()->endOfWeek()
                    ])->count(),
                    'movements_this_month' => \App\Models\StockMovement::whereBetween('created_at', [
                        now()->startOfMonth(),
                        now()->endOfMonth()
                    ])->count(),
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $stats
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch stock movement stats',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    });

    // ============================================================
    // DASHBOARD ANALYTICS ROUTES
    // DEFENSE MINUTES FIX: Updated to exclude expired from available stock counts
    // ============================================================
    Route::prefix('api/dashboard')->group(function () {
        Route::get('/overview', function() {
            try {
                // Get available (non-expired) items for accurate counts
                $availableQuery = \App\Models\InventoryItem::where('status', 'active')
                    ->where(function($q) {
                        $q->whereNull('expiry_date')
                          ->orWhere('expiry_date', '>', now());
                    });
                
                $overview = [
                    'inventory_summary' => [
                        'total_items' => $availableQuery->count(),
                        'low_stock_items' => (clone $availableQuery)->lowStock()->count(),
                        'out_of_stock_items' => (clone $availableQuery)->outOfStock()->count(),
                        'total_value' => $availableQuery->sum(\Illuminate\Support\Facades\DB::raw('stock_quantity * price')),
                        'items_with_barcodes' => \App\Models\InventoryItem::whereNotNull('barcode')->where('barcode', '!=', '')->count(),
                        'items_without_barcodes' => \App\Models\InventoryItem::where(function($q) {
                            $q->whereNull('barcode')->orWhere('barcode', '');
                        })->count(),
                    ],
                    'recent_activities' => [
                        'recent_stock_movements' => \App\Models\StockMovement::with(['inventoryItem:id,sku,name,batch_number', 'user:id,name'])
                            ->orderBy('created_at', 'desc')
                            ->take(5)
                            ->get(),
                        'recently_added_items' => \App\Models\InventoryItem::with(['category:id,name', 'supplier:id,name'])
                            ->orderBy('created_at', 'desc')
                            ->take(5)
                            ->get(['id', 'sku', 'name', 'stock_quantity', 'category_id', 'supplier_id', 'created_at', 'barcode', 'batch_number']),
                    ],
                    'alerts' => [
                        'low_stock_items' => \App\Models\InventoryItem::where('status', 'active')
                            ->whereColumn('stock_quantity', '<=', 'minimum_stock')
                            ->where('stock_quantity', '>', 0) // CRITICAL: Only items with stock > 0
                            ->with(['category:id,name', 'supplier:id,name'])
                            ->orderBy('updated_at', 'desc') // Order by most recently updated
                            ->take(10)
                            ->get(['id', 'sku', 'name', 'stock_quantity', 'minimum_stock', 'category_id', 'supplier_id', 'batch_number', 'updated_at']),
                        'expiring_soon' => \App\Models\InventoryItem::where('expiry_date', '<=', now()->addDays(30))
                            ->where('expiry_date', '>', now())
                            ->orderBy('created_at', 'desc') // Order by most recently created
                            ->take(10)
                            ->get(['id', 'sku', 'name', 'expiry_date', 'stock_quantity', 'batch_number', 'created_at']),
                        'out_of_stock_items' => \App\Models\InventoryItem::where('stock_quantity', 0)
                            ->where('status', 'active')
                            ->with(['category:id,name', 'supplier:id,name'])
                            ->orderBy('updated_at', 'desc')
                            ->take(10)
                            ->get(['id', 'sku', 'name', 'minimum_stock', 'category_id', 'supplier_id', 'batch_number', 'updated_at']),
                        'expired_items' => \App\Models\InventoryItem::whereNotNull('expiry_date')
                            ->where('expiry_date', '<', now())
                            ->where('stock_quantity', '>', 0)
                            ->orderBy('expiry_date', 'desc')
                            ->take(10)
                            ->get(['id', 'sku', 'name', 'expiry_date', 'stock_quantity', 'batch_number']),
                        'missing_barcodes' => \App\Models\InventoryItem::where(function($q) {
                                $q->whereNull('barcode')->orWhere('barcode', '');
                            })
                            ->orderBy('created_at', 'desc')
                            ->take(10)
                            ->get(['id', 'sku', 'name', 'stock_quantity', 'batch_number', 'created_at']),
                    ],
                    'quick_stats' => [
                        'categories_count' => \App\Models\Category::where('status', 'active')->count(),
                        'suppliers_count' => \App\Models\Supplier::where('status', 'active')->count(),
                        'users_count' => \App\Models\User::where('status', 'active')->count(),
                        'movements_today' => \App\Models\StockMovement::whereDate('created_at', today())->count(),
                    ]
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $overview
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error fetching dashboard overview: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve dashboard overview',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        Route::get('/charts', function() {
            try {
                $charts = [
                    'stock_levels_by_category' => \App\Models\Category::withSum('inventoryItems', 'stock_quantity')
                        ->get()
                        ->map(function($category) {
                            return [
                                'category' => $category->name,
                                'total_stock' => $category->inventory_items_sum_stock_quantity ?? 0
                            ];
                        }),
                    'inventory_value_by_supplier' => \App\Models\Supplier::with('inventoryItems')
                        ->get()
                        ->map(function($supplier) {
                            $totalValue = $supplier->inventoryItems->sum(function($item) {
                                return $item->stock_quantity * $item->price;
                            });
                            return [
                                'supplier' => $supplier->name,
                                'total_value' => $totalValue
                            ];
                        }),
                    'stock_movements_trend' => \App\Models\StockMovement::selectRaw('DATE(created_at) as date, type, SUM(quantity) as total_quantity')
                        ->where('created_at', '>=', now()->subDays(30))
                        ->groupBy('date', 'type')
                        ->orderBy('date', 'desc')
                        ->get()
                        ->groupBy('date')
                        ->map(function($movements, $date) {
                            $stockIn = $movements->where('type', 'in')->sum('total_quantity');
                            $stockOut = $movements->where('type', 'out')->sum('total_quantity');
                            return [
                                'date' => $date,
                                'stock_in' => $stockIn,
                                'stock_out' => $stockOut,
                                'net_change' => $stockIn - $stockOut
                            ];
                        })->values(),
                    'barcode_coverage' => [
                        'with_barcodes' => \App\Models\InventoryItem::whereNotNull('barcode')->where('barcode', '!=', '')->count(),
                        'without_barcodes' => \App\Models\InventoryItem::where(function($q) {
                            $q->whereNull('barcode')->orWhere('barcode', '');
                        })->count(),
                    ]
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $charts
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error fetching dashboard charts: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve dashboard charts',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    });
});