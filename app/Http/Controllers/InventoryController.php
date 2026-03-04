<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    /**
     * Generate a unique barcode
     */
    private function generateBarcode($prefix = 'MED'): string
    {
        do {
            // Generate barcode with format: PREFIX + TIMESTAMP + RANDOM
            $timestamp = substr(time(), -6); // Last 6 digits of timestamp
            $random = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $barcode = $prefix . $timestamp . $random;
            
            // Check if barcode already exists
            $exists = InventoryItem::where('barcode', $barcode)->exists();
        } while ($exists);
        
        return $barcode;
    }

    /**
     * Validate product data and return detailed error information
     */
    private function validateProductData($data, $itemId = null): array
    {
        $rules = [
            'sku' => 'required|string|max:50|unique:inventory_items' . ($itemId ? ',sku,' . $itemId : ''),
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'price' => 'required|numeric|min:0.01',
            'cost' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'minimum_stock' => 'required|integer|min:0',
            'maximum_stock' => 'nullable|integer|min:0|gte:minimum_stock',
            'unit' => 'required|string|max:50',
            'status' => 'required|in:active,inactive,discontinued',
            'expiry_date' => 'nullable|date|after:today',
            'batch_number' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100|unique:inventory_items' . ($itemId ? ',barcode,' . $itemId : ''),
            'images' => 'nullable|array',
            'images.*' => 'nullable|string',
        ];

        $messages = [
            'sku.required' => 'SKU is required and cannot be empty',
            'sku.unique' => 'This SKU already exists. Please use a different SKU',
            'name.required' => 'Product name is required and cannot be empty',
            'category_id.required' => 'Please select a valid category',
            'category_id.exists' => 'Selected category does not exist',
            'supplier_id.required' => 'Please select a valid supplier',
            'supplier_id.exists' => 'Selected supplier does not exist',
            'price.required' => 'Price is required',
            'price.min' => 'Price must be greater than 0',
            'stock_quantity.required' => 'Stock quantity is required',
            'stock_quantity.min' => 'Stock quantity cannot be negative',
            'minimum_stock.required' => 'Minimum stock level is required',
            'minimum_stock.min' => 'Minimum stock cannot be negative',
            'maximum_stock.gte' => 'Maximum stock must be greater than or equal to minimum stock',
            'unit.required' => 'Unit of measurement is required',
            'expiry_date.after' => 'Expiry date must be in the future',
            'barcode.unique' => 'This barcode already exists. Please use a different barcode',
        ];

        $validator = Validator::make($data, $rules, $messages);
        
        return [
            'validator' => $validator,
            'has_errors' => $validator->fails(),
            'errors' => $validator->errors(),
            'formatted_errors' => $this->formatValidationErrors($validator->errors())
        ];
    }

    /**
     * Format validation errors for better display
     */
    private function formatValidationErrors($errors): array
    {
        $formatted = [];
        foreach ($errors->all() as $error) {
            $formatted[] = [
                'type' => 'validation_error',
                'message' => $error,
                'severity' => 'high'
            ];
        }
        return $formatted;
    }

    /**
     * Check if item can be safely deleted
     */
    private function canDeleteItem($itemId): array
    {
        $item = InventoryItem::findOrFail($itemId);
        
        // Check for stock movements
        $movementCount = StockMovement::where('inventory_item_id', $itemId)->count();
        
        $canDelete = $movementCount === 0;
        $warnings = [];
        
        if ($movementCount > 0) {
            $warnings[] = [
                'type' => 'stock_movements',
                'count' => $movementCount,
                'message' => "This item has {$movementCount} stock movement record(s). Deleting will remove all transaction history."
            ];
        }
        
        if ($item->stock_quantity > 0) {
            $warnings[] = [
                'type' => 'current_stock',
                'quantity' => $item->stock_quantity,
                'message' => "This item currently has {$item->stock_quantity} {$item->unit} in stock. Consider reducing stock to zero first."
            ];
        }
        
        return [
            'can_delete' => $canDelete,
            'warnings' => $warnings,
            'requires_confirmation' => !$canDelete || count($warnings) > 0
        ];
    }



    /**
     * Get available reference numbers for stock adjustments
     */
    public function getAvailableReferenceNumbers(Request $request)
    {
        try {
            $itemId = $request->input('item_id');
            
            // Get recent reference numbers for this item or all items
            $query = StockMovement::select('reference_number')
                ->whereNotNull('reference_number')
                ->where('reference_number', '!=', '');
                
            if ($itemId) {
                $query->where('inventory_item_id', $itemId);
            }
            
            $referenceNumbers = $query->distinct()
                ->orderBy('created_at', 'desc')
                ->take(50)
                ->pluck('reference_number')
                ->filter()
                ->values();
            
            // Generate suggested reference numbers
            $suggestions = [
                'ADJ-' . date('Ymd') . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
                'INV-' . date('Ymd') . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
                'RESTOCK-' . date('Ymd') . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
                'SALES-' . date('Ymd') . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT),
            ];
            
            return response()->json([
                'success' => true,
                'data' => [
                    'recent_references' => $referenceNumbers,
                    'suggestions' => $suggestions,
                    'format_examples' => [
                        'ADJ-YYYYMMDD-001 (for adjustments)',
                        'INV-YYYYMMDD-001 (for inventory counts)',
                        'RESTOCK-YYYYMMDD-001 (for restocking)',
                        'SALES-YYYYMMDD-001 (for sales returns)'
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting reference numbers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get reference numbers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if item can be deleted
     */
    public function checkDeletion($id)
    {
        try {
            $item = InventoryItem::findOrFail($id);
            $deleteCheck = $this->canDeleteItem($id);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'item_name' => $item->name,
                    'can_delete' => $deleteCheck['can_delete'],
                    'requires_confirmation' => $deleteCheck['requires_confirmation'],
                    'warnings' => $deleteCheck['warnings']
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Bulk generate barcodes for items without barcodes
     */
    public function bulkGenerateBarcodes(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'prefix' => 'nullable|string|max:5|alpha',
                'item_ids' => 'nullable|array',
                'item_ids.*' => 'exists:inventory_items,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $prefix = $request->input('prefix', 'MED');
            $itemIds = $request->input('item_ids');
            
            $query = InventoryItem::query();
            
            if ($itemIds) {
                $query->whereIn('id', $itemIds);
            } else {
                // Generate for items without barcodes
                $query->where(function($q) {
                    $q->whereNull('barcode')->orWhere('barcode', '');
                });
            }
            
            $items = $query->get();
            $generatedCount = 0;
            
            DB::beginTransaction();
            
            foreach ($items as $item) {
                $newBarcode = $this->generateBarcode($prefix);
                $item->update(['barcode' => $newBarcode]);
                $generatedCount++;
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'generated_count' => $generatedCount,
                    'prefix_used' => $prefix
                ],
                'message' => "Successfully generated {$generatedCount} barcodes"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error bulk generating barcodes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate barcodes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    






/**
 * Get check Batch Expiration - FIXED VERSION
 */
public function checkBatchExpiration(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'days_ahead' => 'nullable|integer|min:1|max:365'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // CRITICAL FIX: Cast to integer to prevent Carbon type error
        $daysAhead = (int) $request->input('days_ahead', 30);
        
        // Alternative fix - ensure it's an integer
        // $daysAhead = intval($request->input('days_ahead', 30));
        
        $expiringItems = InventoryItem::where('expiry_date', '<=', now()->addDays($daysAhead))
            ->where('expiry_date', '>', now())
            ->with(['category:id,name', 'supplier:id,name'])
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function($item) use ($daysAhead) {
                // CRITICAL FIX: Use Carbon properly for date calculations
                $expiryDate = \Carbon\Carbon::parse($item->expiry_date);
                $daysUntilExpiry = $expiryDate->diffInDays(now());
                
                return [
                    'id' => $item->id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'batch_number' => $item->batch_number,
                    'expiry_date' => $item->expiry_date->format('Y-m-d'),
                    'days_until_expiry' => (int) $daysUntilExpiry,
                    'stock_quantity' => $item->stock_quantity,
                    'category' => $item->category->name ?? 'Unknown',
                    'supplier' => $item->supplier->name ?? 'Unknown',
                    'price' => $item->price,
                    'minimum_stock' => $item->minimum_stock,
                    'status' => $this->getExpiryStatus($daysUntilExpiry)
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $expiringItems,
            'summary' => [
                'total_expiring_items' => $expiringItems->count(),
                'total_expiring_stock' => $expiringItems->sum('stock_quantity'),
                'check_date_range' => "{$daysAhead} days from now",
                'expired_items' => $expiringItems->where('days_until_expiry', '<=', 0)->count(),
                'critical_items' => $expiringItems->where('days_until_expiry', '>', 0)->where('days_until_expiry', '<=', 7)->count(),
                'warning_items' => $expiringItems->where('days_until_expiry', '>', 7)->where('days_until_expiry', '<=', 14)->count(),
                'notice_items' => $expiringItems->where('days_until_expiry', '>', 14)->where('days_until_expiry', '<=', 30)->count(),
            ]
        ]);
    } catch (\Exception $e) {
        Log::error('Error checking batch expiration: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to check batch expiration',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Helper method to get expiry status
 */
private function getExpiryStatus($daysUntilExpiry): string
{
    if ($daysUntilExpiry <= 0) {
        return 'Expired';
    } elseif ($daysUntilExpiry <= 7) {
        return 'Critical';
    } elseif ($daysUntilExpiry <= 14) {
        return 'Warning';
    } elseif ($daysUntilExpiry <= 30) {
        return 'Notice';
    } else {
        return 'Good';
    }
}

/**
 * Export batch expiration data to CSV - FIXED VERSION
 */
public function exportBatchExpiration(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'days_ahead' => 'nullable|integer|min:1|max:365'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // CRITICAL FIX: Cast to integer
        $daysAhead = (int) $request->input('days_ahead', 30);
        
        $expiringItems = InventoryItem::where('expiry_date', '<=', now()->addDays($daysAhead))
            ->where('expiry_date', '>', now())
            ->with(['category:id,name', 'supplier:id,name'])
            ->orderBy('expiry_date', 'asc')
            ->get();

        $filename = 'batch_expiration_' . now()->format('Y-m-d_H-i-s') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($expiringItems) {
            $file = fopen('php://output', 'w');
            
            // Add CSV headers
            fputcsv($file, [
                'SKU',
                'Name',
                'Batch Number',
                'Expiry Date',
                'Days Until Expiry',
                'Stock Quantity',
                'Category',
                'Supplier',
                'Price',
                'Minimum Stock',
                'Status'
            ]);
            
            // Add data rows
            foreach ($expiringItems as $item) {
                $expiryDate = \Carbon\Carbon::parse($item->expiry_date);
                $daysUntilExpiry = (int) $expiryDate->diffInDays(now());
                $status = $daysUntilExpiry <= 0 ? 'Expired' : 
                         ($daysUntilExpiry <= 7 ? 'Critical' : 
                         ($daysUntilExpiry <= 14 ? 'Warning' : 'Notice'));
                
                fputcsv($file, [
                    $item->sku,
                    $item->name,
                    $item->batch_number ?? '',
                    $item->expiry_date ? $item->expiry_date->format('Y-m-d') : '',
                    $daysUntilExpiry,
                    $item->stock_quantity,
                    $item->category->name ?? '',
                    $item->supplier->name ?? '',
                    $item->price,
                    $item->minimum_stock,
                    $status
                ]);
            }
            
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    } catch (\Exception $e) {
        Log::error('Error exporting batch expiration: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to export batch expiration data',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get out of stock notifications
 * DEFENSE MINUTES FIX: Separate notification system for out of stock items
 */
public function outOfStockNotifications()
{
    try {
        $outOfStock = InventoryItem::where('stock_quantity', 0)
            ->where('status', 'active')
            ->with(['category', 'supplier'])
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'sku' => $item->sku,
                    'batch_number' => $item->batch_number,
                    'category' => $item->category?->name,
                    'supplier' => $item->supplier?->name,
                    'minimum_stock' => $item->minimum_stock,
                    'last_updated' => $item->updated_at,
                    'severity' => 'critical',
                ];
            });
        
        return response()->json([
            'success' => true,
            'data' => [
                'count' => $outOfStock->count(),
                'items' => $outOfStock,
                'message' => $outOfStock->count() > 0 
                    ? "{$outOfStock->count()} item(s) are out of stock and need immediate attention" 
                    : "No items out of stock"
            ],
            'message' => $outOfStock->count() > 0 
                ? "{$outOfStock->count()} item(s) are out of stock" 
                : "No items out of stock"
        ]);
    } catch (\Exception $e) {
        Log::error('Error getting out of stock notifications: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to retrieve notifications',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get expired items (separated from available stock)
 * DEFENSE MINUTES FIX: Expired products should be separate from available stock
 */
public function expiredItems()
{
    try {
        $expired = InventoryItem::whereNotNull('expiry_date')
            ->where('expiry_date', '<', now())
            ->where('stock_quantity', '>', 0) // Only items that still have stock
            ->with(['category', 'supplier'])
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function($item) {
                $daysExpired = now()->diffInDays($item->expiry_date, false);
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'sku' => $item->sku,
                    'batch_number' => $item->batch_number,
                    'category' => $item->category?->name,
                    'supplier' => $item->supplier?->name,
                    'stock_quantity' => $item->stock_quantity,
                    'expiry_date' => $item->expiry_date->format('Y-m-d'),
                    'days_expired' => abs($daysExpired),
                    'urgency' => abs($daysExpired) > 30 ? 'high' : 'critical',
                ];
            });
        
        return response()->json([
            'success' => true,
            'data' => [
                'count' => $expired->count(),
                'items' => $expired,
                'total_quantity_affected' => $expired->sum('stock_quantity'),
            ],
            'message' => $expired->count() > 0 
                ? "WARNING: {$expired->count()} expired item(s) found - Remove from available stock immediately!" 
                : "No expired items"
        ]);
    } catch (\Exception $e) {
        Log::error('Error getting expired items: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to retrieve expired items',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Get available stock only (excludes expired items)
 * DEFENSE MINUTES FIX: Available stock calculation should exclude expired
 */
public function availableStock()
{
    try {
        $available = InventoryItem::where('stock_quantity', '>', 0)
            ->where('status', 'active')
            ->where(function($query) {
                $query->whereNull('expiry_date')
                      ->orWhere('expiry_date', '>', now());
            })
            ->with(['category', 'supplier'])
            ->get();
        
        $summary = [
            'total_items' => $available->count(),
            'total_quantity' => $available->sum('stock_quantity'),
            'total_value' => $available->sum(function($item) {
                return $item->stock_quantity * $item->price;
            }),
            'low_stock_items' => $available->filter(function($item) {
                return $item->stock_quantity <= $item->minimum_stock;
            })->count(),
        ];
        
        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'items' => $available
            ],
            'message' => 'Available stock retrieved successfully (expired items excluded)'
        ]);
    } catch (\Exception $e) {
        Log::error('Error getting available stock: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to retrieve available stock',
            'error' => $e->getMessage()
        ], 500);
    }
}


public function scopeAvailableStock($query)
{
    return $query->where('stock_quantity', '>', 0)
                 ->where(function($q) {
                     $q->whereNull('expiry_date')
                       ->orWhere('expiry_date', '>', now());
                 });
}

public function scopeExpired($query)
{
    return $query->whereNotNull('expiry_date')
                 ->where('expiry_date', '<', now());
}



    
    /**
     * Display a listing of inventory items with pagination and filters.
     */
    public function index(Request $request)
    {
        try {
            $query = InventoryItem::with(['category', 'supplier']);
            
            // Apply search filter (including barcode search)
            if ($search = $request->input('search')) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('sku', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                });
            }
            
            // Apply category filter
            if ($categoryId = $request->input('category_id')) {
                $query->where('category_id', $categoryId);
            }
            
            // Apply supplier filter
            if ($supplierId = $request->input('supplier_id')) {
                $query->where('supplier_id', $supplierId);
            }
            
            // Apply status filter
            if ($status = $request->input('status')) {
                if ($status === 'low_stock') {
                    $query->lowStock();
                } elseif ($status === 'out_of_stock') {
                    $query->outOfStock();
                } elseif ($status === 'in_stock') {
                    $query->inStock();
                } else {
                    $query->where('status', $status);
                }
            }
            
            // Apply sorting
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            
            // Validate sort column to prevent SQL injection
            $allowedSortColumns = ['name', 'sku', 'price', 'stock_quantity', 'minimum_stock', 'created_at', 'updated_at'];
            if (in_array($sortBy, $allowedSortColumns)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->orderBy('name', 'asc');
            }
            
            // Get paginated results
            $perPage = $request->input('per_page', 15);
            $perPage = min(max($perPage, 1), 100); // Limit between 1 and 100
            $items = $query->paginate($perPage);
            
            return response()->json([
                'success' => true,
                'data' => $items->items(),
                'pagination' => [
                    'current_page' => $items->currentPage(),
                    'last_page' => $items->lastPage(),
                    'per_page' => $items->perPage(),
                    'total' => $items->total(),
                    'from' => $items->firstItem(),
                    'to' => $items->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching inventory items: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve inventory items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created inventory item in the database.
     */
    public function store(Request $request)
    {
        try {
            // Validate input data with detailed error messages
            $validation = $this->validateProductData($request->all());
            
            if ($validation['has_errors']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed. Please check the highlighted fields.',
                    'errors' => $validation['errors'],
                    'detailed_errors' => $validation['formatted_errors']
                ], 422);
            }

            $validated = $validation['validator']->validated();
            
            // Auto-generate barcode if not provided
            if (empty($validated['barcode'])) {
                $prefix = $request->input('barcode_prefix', 'MED');
                $validated['barcode'] = $this->generateBarcode($prefix);
            }
            
            DB::beginTransaction();
            
            $item = InventoryItem::create($validated);
            
            // Create initial stock movement record with proper reference
            if ($item->stock_quantity > 0) {
                $referenceNumber = $request->input('initial_reference', 'INIT-' . date('Ymd') . '-' . $item->id);
                
                StockMovement::create([
                    'inventory_item_id' => $item->id,
                    'user_id' => Auth::id(),
                    'type' => 'in',
                    'quantity' => $item->stock_quantity,
                    'previous_stock' => 0,
                    'new_stock' => $item->stock_quantity,
                    'reason' => 'Initial stock',
                    'notes' => 'Initial inventory entry',
                    'reference_number' => $referenceNumber
                ]);
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => $item->load(['category', 'supplier']),
                'message' => 'Inventory item created successfully with auto-generated barcode',
                'barcode_generated' => !$request->filled('barcode')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating inventory item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create inventory item. Please try again.',
                'error' => $e->getMessage(),
                'detailed_errors' => [
                    [
                        'type' => 'system_error',
                        'message' => 'A system error occurred while saving the product. Please contact support if this persists.',
                        'severity' => 'high'
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Display the specified inventory item.
     */
    public function show($id)
    {
        try {
            $item = InventoryItem::with(['category', 'supplier', 'stockMovements.user'])->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $item
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching inventory item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Inventory item not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified inventory item in the database.
     */
    public function update(Request $request, $id)
    {
        try {
            $item = InventoryItem::findOrFail($id);
            
            // Validate input data with detailed error messages
            $validation = $this->validateProductData($request->all(), $id);
            
            if ($validation['has_errors']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed. Please check the highlighted fields.',
                    'errors' => $validation['errors'],
                    'detailed_errors' => $validation['formatted_errors']
                ], 422);
            }

            $validated = $validation['validator']->validated();
            
            DB::beginTransaction();
            
            $item->update($validated);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => $item->load(['category', 'supplier']),
                'message' => 'Inventory item updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating inventory item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update inventory item',
                'error' => $e->getMessage(),
                'detailed_errors' => [
                    [
                        'type' => 'system_error',
                        'message' => 'A system error occurred while updating the product.',
                        'severity' => 'high'
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Remove the specified inventory item from the database.
     */
    public function destroy(Request $request, $id)
    {
        try {
            $item = InventoryItem::findOrFail($id);
            
            // Check if forced deletion is requested
            $forceDelete = $request->input('force_delete', false);
            
            if (!$forceDelete) {
                $deleteCheck = $this->canDeleteItem($id);
                
                if (!$deleteCheck['can_delete']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot delete this item due to existing references',
                        'warnings' => $deleteCheck['warnings'],
                        'requires_confirmation' => true
                    ], 400);
                }
            }
            
            DB::beginTransaction();
            
            $itemName = $item->name;
            
            // If force delete, remove related records first
            if ($forceDelete) {
                StockMovement::where('inventory_item_id', $id)->delete();
            }
            
            $item->delete();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => "Inventory item '{$itemName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting inventory item: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete inventory item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Adjust stock quantity for an inventory item with reference number validation.
     */
    public function adjustStock(Request $request, $id)
    {
        try {
            $item = InventoryItem::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'quantity' => 'required|integer',
                'type' => 'required|in:in,out,adjustment',
                'reason' => 'required|string|max:255',
                'notes' => 'nullable|string|max:1000',
                'reference_number' => 'required|string|max:100',
            ], [
                'reference_number.required' => 'Reference number is required to track stock adjustments and avoid conflicts'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();
            
            // Check for duplicate reference number to avoid conflicts
            $existingMovement = StockMovement::where('reference_number', $validated['reference_number'])
                ->where('inventory_item_id', $id)
                ->first();
                
            if ($existingMovement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reference number already exists for this item',
                    'duplicate_reference' => [
                        'reference' => $validated['reference_number'],
                        'existing_date' => $existingMovement->created_at,
                        'existing_user' => $existingMovement->user->name ?? 'Unknown'
                    ]
                ], 409);
            }
            
            DB::beginTransaction();
            
            $previousStock = $item->stock_quantity;
            $quantity = $validated['quantity'];
            
            // Calculate new stock based on movement type
            switch ($validated['type']) {
                case 'in':
                    $newStock = $previousStock + $quantity;
                    break;
                case 'out':
                    $newStock = $previousStock - $quantity;
                    if ($newStock < 0) {
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient stock quantity. Available: {$previousStock}, Requested: {$quantity}"
                        ], 400);
                    }
                    break;
                case 'adjustment':
                    $newStock = $quantity; // Direct adjustment to specific quantity
                    $quantity = $newStock - $previousStock; // Calculate difference for movement record
                    break;
            }
            
            // Update item stock
            $item->update(['stock_quantity' => $newStock]);
            
            // Create stock movement record
            StockMovement::create([
                'inventory_item_id' => $item->id,
                'user_id' => Auth::id(),
                'type' => $validated['type'],
                'quantity' => abs($quantity),
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'reason' => $validated['reason'],
                'notes' => $validated['notes'] ?? null,
                'reference_number' => $validated['reference_number'],
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'item' => $item->fresh()->load(['category', 'supplier']),
                    'movement' => [
                        'type' => $validated['type'],
                        'quantity' => abs($quantity),
                        'previous_stock' => $previousStock,
                        'new_stock' => $newStock,
                        'reason' => $validated['reason'],
                        'reference_number' => $validated['reference_number']
                    ]
                ],
                'message' => 'Stock adjusted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adjusting stock: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to adjust stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get stock movement history for an item.
     */
    public function stockHistory($id)
    {
        try {
            $item = InventoryItem::findOrFail($id);
            
            $movements = $item->stockMovements()
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->paginate(20);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'item' => $item->only(['id', 'sku', 'name', 'stock_quantity']),
                    'movements' => $movements->items(),
                    'pagination' => [
                        'current_page' => $movements->currentPage(),
                        'last_page' => $movements->lastPage(),
                        'per_page' => $movements->perPage(),
                        'total' => $movements->total()
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching stock history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve stock history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory statistics.
     */
    public function stats()
    {
        try {
            $stats = [
                'total_items' => InventoryItem::count(),
                'active_items' => InventoryItem::where('status', 'active')->count(),
                'inactive_items' => InventoryItem::where('status', 'inactive')->count(),
                'discontinued_items' => InventoryItem::where('status', 'discontinued')->count(),
                'low_stock_items' => InventoryItem::lowStock()->count(),
                'out_of_stock_items' => InventoryItem::outOfStock()->count(),
                'in_stock_items' => InventoryItem::inStock()->count(),
                'total_categories' => Category::active()->count(),
                'total_suppliers' => Supplier::active()->count(),
                'total_inventory_value' => InventoryItem::sum(DB::raw('stock_quantity * price')),
                'average_item_price' => InventoryItem::avg('price'),
                'expiring_soon_items' => InventoryItem::where('expiry_date', '<=', now()->addDays(30))
                    ->where('expiry_date', '>', now())
                    ->count(),
                'expired_items' => InventoryItem::where('expiry_date', '<', now())->count(),
                'items_with_barcodes' => InventoryItem::whereNotNull('barcode')->where('barcode', '!=', '')->count(),
                'items_without_barcodes' => InventoryItem::where(function($q) {
                    $q->whereNull('barcode')->orWhere('barcode', '');
                })->count(),
            ];
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting inventory stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve inventory statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get low stock items.
     */
    public function lowStockItems()
    {
        try {
            $items = InventoryItem::lowStock()
                ->with(['category', 'supplier'])
                ->orderBy('stock_quantity', 'asc')
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'category' => $item->category->name,
                        'supplier' => $item->supplier->name,
                        'stock_quantity' => $item->stock_quantity,
                        'minimum_stock' => $item->minimum_stock,
                        'difference' => $item->minimum_stock - $item->stock_quantity,
                        'status' => $item->getStockStatus()
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => $items
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching low stock items: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve low stock items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update inventory items.
     */
    public function bulkUpdate(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'item_ids' => 'required|array',
                'item_ids.*' => 'exists:inventory_items,id',
                'updates' => 'required|array',
                'updates.status' => 'sometimes|in:active,inactive,discontinued',
                'updates.minimum_stock' => 'sometimes|integer|min:0',
                'updates.maximum_stock' => 'sometimes|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();
            
            DB::beginTransaction();
            
            $updatedCount = InventoryItem::whereIn('id', $validated['item_ids'])
                ->update($validated['updates']);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'updated_count' => $updatedCount,
                    'updates' => $validated['updates']
                ],
                'message' => "Successfully updated {$updatedCount} inventory item(s)"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error bulk updating inventory items: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to bulk update inventory items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export inventory items to CSV.
     */
    public function export(Request $request)
    {
        try {
            $query = InventoryItem::with(['category', 'supplier']);
            
            // Apply same filters as index method
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
            
            if ($supplierId = $request->input('supplier_id')) {
                $query->where('supplier_id', $supplierId);
            }
            
            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }
            
            $items = $query->orderBy('name')->get();
            
            $filename = 'inventory_export_' . now()->format('Y-m-d_H-i-s') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ];
            
            $callback = function() use ($items) {
                $file = fopen('php://output', 'w');
                
                // Add CSV headers
                fputcsv($file, [
                    'SKU',
                    'Name',
                    'Description',
                    'Category',
                    'Supplier',
                    'Price',
                    'Cost',
                    'Stock Quantity',
                    'Minimum Stock',
                    'Maximum Stock',
                    'Unit',
                    'Status',
                    'Barcode',
                    'Expiry Date',
                    'Batch Number',
                    'Created At',
                    'Updated At'
                ]);
                
                // Add data rows
                foreach ($items as $item) {
                    fputcsv($file, [
                        $item->sku,
                        $item->name,
                        $item->description,
                        $item->category->name ?? '',
                        $item->supplier->name ?? '',
                        $item->price,
                        $item->cost,
                        $item->stock_quantity,
                        $item->minimum_stock,
                        $item->maximum_stock,
                        $item->unit,
                        $item->status,
                        $item->barcode,
                        $item->expiry_date?->format('Y-m-d'),
                        $item->batch_number,
                        $item->created_at->format('Y-m-d H:i:s'),
                        $item->updated_at->format('Y-m-d H:i:s')
                    ]);
                }
                
                fclose($file);
            };
            
            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error exporting inventory: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export inventory',
                'error' => $e->getMessage()
            ], 500);
        }
    }
  
    /**
     * Get validate Category Usage
     */
    public function validateCategoryUsage($categoryId)
    {
        try {
            $category = Category::findOrFail($categoryId);
            $itemsCount = $category->inventoryItems()->count();
            
            if ($itemsCount > 0) {
                $items = $category->inventoryItems()
                    ->select('id', 'sku', 'name', 'stock_quantity')
                    ->get();
                    
                return response()->json([
                    'success' => false,
                    'message' => "Cannot modify/delete category. It contains {$itemsCount} items.",
                    'data' => [
                        'category' => $category->name,
                        'items_count' => $itemsCount,
                        'items' => $items
                    ]
                ], 400);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Category can be safely modified/deleted'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error validating category usage',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate Purchase List
     */
    public function generatePurchaseList(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'supplier_id' => 'nullable|exists:suppliers,id',
                'category_id' => 'nullable|exists:categories,id',
                'include_low_stock' => 'boolean',
                'include_out_of_stock' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = InventoryItem::with(['category:id,name', 'supplier:id,name,email,phone'])
                ->where('status', 'active');
                
            // Apply filters
            if ($request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }
            
            if ($request->category_id) {
                $query->where('category_id', $request->category_id);
            }
            
            // Stock level filters
            if ($request->include_low_stock && $request->include_out_of_stock) {
                $query->where(function($q) {
                    $q->whereColumn('stock_quantity', '<=', 'minimum_stock');
                });
            } elseif ($request->include_low_stock) {
                $query->lowStock()->where('stock_quantity', '>', 0);
            } elseif ($request->include_out_of_stock) {
                $query->outOfStock();
            } else {
                // Default: both low stock and out of stock
                $query->whereColumn('stock_quantity', '<=', 'minimum_stock');
            }
            
            $items = $query->orderBy('supplier_id')
                ->orderBy('category_id')
                ->orderBy('name')
                ->get()
                ->map(function($item) {
                    $suggestedQuantity = max(
                        $item->maximum_stock ? ($item->maximum_stock - $item->stock_quantity) : ($item->minimum_stock * 2),
                        $item->minimum_stock - $item->stock_quantity
                    );
                    
                    return [
                        'id' => $item->id,
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'category' => $item->category->name,
                        'supplier' => [
                            'name' => $item->supplier->name,
                            'email' => $item->supplier->email,
                            'phone' => $item->supplier->phone
                        ],
                        'current_stock' => $item->stock_quantity,
                        'minimum_stock' => $item->minimum_stock,
                        'maximum_stock' => $item->maximum_stock,
                        'suggested_order_quantity' => $suggestedQuantity,
                        'unit_cost' => $item->cost,
                        'estimated_total_cost' => $suggestedQuantity * ($item->cost ?? $item->price),
                        'stock_status' => $item->getStockStatus(),
                        'priority' => $item->stock_quantity == 0 ? 'High' : ($item->isLowStock() ? 'Medium' : 'Low')
                    ];
                });
                
            // Group by supplier for easier procurement
            $groupedBySupplier = $items->groupBy('supplier.name')->map(function($supplierItems, $supplierName) {
                $totalCost = $supplierItems->sum('estimated_total_cost');
                $itemsCount = $supplierItems->count();
                
                return [
                    'supplier_name' => $supplierName,
                    'supplier_contact' => $supplierItems->first()['supplier'],
                    'items_count' => $itemsCount,
                    'total_estimated_cost' => $totalCost,
                    'items' => $supplierItems->values()
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'purchase_list' => $items,
                    'grouped_by_supplier' => $groupedBySupplier,
                    'summary' => [
                        'total_items' => $items->count(),
                        'total_estimated_cost' => $items->sum('estimated_total_cost'),
                        'suppliers_involved' => $groupedBySupplier->count(),
                        'high_priority_items' => $items->where('priority', 'High')->count(),
                        'generated_at' => now()->format('Y-m-d H:i:s')
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating purchase list: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate purchase list',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enhanced development roadmap
     */
    public function getDevelopmentRoadmap()
    {
        try {
            $roadmap = [
                'current_version' => '1.0.0',
                'development_phases' => [
                    [
                        'phase' => 'Phase 1 - Core Implementation',
                        'duration' => '2-3 months',
                        'status' => 'Completed',
                        'features' => [
                            'Basic inventory management',
                            'Auto-generated barcodes',
                            'Stock movements tracking',
                            'User management'
                        ]
                    ],
                    [
                        'phase' => 'Phase 2 - Enhanced Features',
                        'duration' => '2 months',
                        'status' => 'In Progress',
                        'features' => [
                            'Advanced reporting',
                            'Batch expiration tracking',
                            'Purchase order generation',
                            'Supplier performance analytics'
                        ]
                    ],
                    [
                        'phase' => 'Phase 3 - Intelligence Features',
                        'duration' => '3 months',
                        'status' => 'Planned',
                        'features' => [
                            'Demand forecasting',
                            'Automated reorder points',
                            'AI-driven insights',
                            'Mobile application'
                        ]
                    ]
                ],
                'barcode_features' => [
                    'Auto-generation with custom prefixes',
                    'Bulk barcode generation',
                    'Barcode validation and conflict prevention',
                    'Search and filter by barcode',
                    'Integration with POS system'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $roadmap
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve development roadmap',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}