<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    /**
     * Display a listing of suppliers with pagination and filters.
     */
    public function index(Request $request)
    {
        try {
            $query = Supplier::withCount('inventoryItems');
            
            // Apply search filter
            if ($search = $request->input('search')) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('contact_person', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%");
                });
            }
            
            // Apply status filter
            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }
            
            // Apply sorting
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            
            // Validate sort column to prevent SQL injection
            $allowedSortColumns = ['name', 'contact_person', 'email', 'phone', 'status', 'created_at', 'updated_at'];
            if (in_array($sortBy, $allowedSortColumns)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->orderBy('name', 'asc');
            }
            
            // Get paginated results
            $perPage = $request->input('per_page', 15);
            $perPage = min(max($perPage, 1), 100); // Limit between 1 and 100
            $suppliers = $query->paginate($perPage);
            
            return response()->json([
                'success' => true,
                'data' => $suppliers->items(),
                'pagination' => [
                    'current_page' => $suppliers->currentPage(),
                    'last_page' => $suppliers->lastPage(),
                    'per_page' => $suppliers->perPage(),
                    'total' => $suppliers->total(),
                    'from' => $suppliers->firstItem(),
                    'to' => $suppliers->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching suppliers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created supplier in the database.
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:suppliers',
                'contact_person' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255|unique:suppliers',
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:1000',
                'status' => 'required|in:active,inactive',
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
            
            $supplier = Supplier::create($validated);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => $supplier->loadCount('inventoryItems'),
                'message' => 'Supplier created successfully'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating supplier: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified supplier.
     */
    public function show($id)
    {
        try {
            $supplier = Supplier::withCount('inventoryItems')
                ->with(['inventoryItems' => function($query) {
                    $query->select('id', 'sku', 'name', 'stock_quantity', 'minimum_stock', 'price', 'status', 'supplier_id')
                          ->orderBy('name');
                }])
                ->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $supplier
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching supplier: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Supplier not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified supplier in the database.
     */
    public function update(Request $request, $id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:suppliers,name,' . $supplier->id,
                'contact_person' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255|unique:suppliers,email,' . $supplier->id,
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:1000',
                'status' => 'required|in:active,inactive',
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
            
            $supplier->update($validated);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => $supplier->loadCount('inventoryItems'),
                'message' => 'Supplier updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating supplier: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified supplier from the database.
     */
    public function destroy($id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            
            // Check if supplier has inventory items
            $inventoryCount = $supplier->inventoryItems()->count();
            if ($inventoryCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete supplier that has {$inventoryCount} inventory item(s). Please reassign or remove the items first."
                ], 400);
            }
            
            DB::beginTransaction();
            
            $supplierName = $supplier->name;
            $supplier->delete();
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => "Supplier '{$supplierName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting supplier: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete supplier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active suppliers for dropdown/select options.
     */
    public function getAllActive()
    {
        try {
            $suppliers = Supplier::active()
                ->select('id', 'name', 'contact_person', 'email', 'phone')
                ->orderBy('name')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $suppliers
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching active suppliers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve active suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get supplier statistics.
     */
    public function stats()
    {
        try {
            $stats = [
                'total_suppliers' => Supplier::count(),
                'active_suppliers' => Supplier::where('status', 'active')->count(),
                'inactive_suppliers' => Supplier::where('status', 'inactive')->count(),
                'suppliers_with_items' => Supplier::has('inventoryItems')->count(),
                'suppliers_without_items' => Supplier::doesntHave('inventoryItems')->count(),
                'top_suppliers' => Supplier::withCount('inventoryItems')
                    ->orderBy('inventory_items_count', 'desc')
                    ->take(5)
                    ->get(['id', 'name', 'inventory_items_count']),
                'recently_added' => Supplier::latest()
                    ->take(5)
                    ->get(['id', 'name', 'created_at', 'status'])
            ];
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting supplier stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve supplier statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get suppliers with low inventory items.
     */
    public function suppliersWithLowStock()
    {
        try {
            $suppliers = Supplier::whereHas('inventoryItems', function($query) {
                $query->whereColumn('stock_quantity', '<=', 'minimum_stock')
                      ->where('stock_quantity', '>', 0); // Exclude out of stock
            })
            ->withCount(['inventoryItems as low_stock_items_count' => function($query) {
                $query->whereColumn('stock_quantity', '<=', 'minimum_stock')
                      ->where('stock_quantity', '>', 0); // Exclude out of stock
            }])
            ->with(['inventoryItems' => function($query) {
                $query->whereColumn('stock_quantity', '<=', 'minimum_stock')
                      ->where('stock_quantity', '>', 0) // Exclude out of stock
                      ->select('id', 'sku', 'name', 'stock_quantity', 'minimum_stock', 'supplier_id');
            }])
            ->orderBy('low_stock_items_count', 'desc')
            ->get();
            
            return response()->json([
                'success' => true,
                'data' => $suppliers
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching suppliers with low stock: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve suppliers with low stock',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update supplier status.
     */
    public function bulkUpdateStatus(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'supplier_ids' => 'required|array',
                'supplier_ids.*' => 'exists:suppliers,id',
                'status' => 'required|in:active,inactive'
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
            
            $updatedCount = Supplier::whereIn('id', $validated['supplier_ids'])
                ->update(['status' => $validated['status']]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'updated_count' => $updatedCount,
                    'status' => $validated['status']
                ],
                'message' => "Successfully updated {$updatedCount} supplier(s) to {$validated['status']}"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error bulk updating supplier status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update supplier status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search suppliers by name or contact info.
     */
    public function search(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'query' => 'required|string|min:1|max:255',
                'limit' => 'nullable|integer|min:1|max:50'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = $request->input('query');
            $limit = $request->input('limit', 10);
            
            $suppliers = Supplier::where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('contact_person', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%")
                  ->orWhere('phone', 'like', "%{$query}%");
            })
            ->select('id', 'name', 'contact_person', 'email', 'phone', 'status')
            ->orderBy('name')
            ->limit($limit)
            ->get();
            
            return response()->json([
                'success' => true,
                'data' => $suppliers,
                'query' => $query,
                'count' => $suppliers->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error searching suppliers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to search suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get supplier performance metrics.
     */
    public function performance($id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            
            $performance = [
                'supplier_info' => [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'contact_person' => $supplier->contact_person,
                    'status' => $supplier->status
                ],
                'inventory_metrics' => [
                    'total_items' => $supplier->inventoryItems()->count(),
                    'active_items' => $supplier->inventoryItems()->where('status', 'active')->count(),
                    'low_stock_items' => $supplier->inventoryItems()
                        ->whereColumn('stock_quantity', '<=', 'minimum_stock')
                        ->where('stock_quantity', '>', 0) // Exclude out of stock
                        ->count(),
                    'out_of_stock_items' => $supplier->inventoryItems()->where('stock_quantity', 0)->count(),
                    'total_inventory_value' => $supplier->inventoryItems()->sum(DB::raw('stock_quantity * price')),
                    'average_item_price' => $supplier->inventoryItems()->avg('price')
                ],
                'categories_supplied' => $supplier->inventoryItems()
                    ->with('category:id,name')
                    ->get()
                    ->groupBy('category.name')
                    ->map(function($items, $categoryName) {
                        return [
                            'category' => $categoryName,
                            'item_count' => $items->count(),
                            'total_stock' => $items->sum('stock_quantity'),
                            'total_value' => $items->sum(function($item) {
                                return $item->stock_quantity * $item->price;
                            })
                        ];
                    })
                    ->values(),
                'recent_stock_movements' => $supplier->inventoryItems()
                    ->with(['stockMovements' => function($query) {
                        $query->latest()->take(10)->with('user:id,name');
                    }])
                    ->get()
                    ->pluck('stockMovements')
                    ->flatten()
                    ->sortByDesc('created_at')
                    ->take(10)
                    ->values()
            ];
            
            return response()->json([
                'success' => true,
                'data' => $performance
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching supplier performance: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve supplier performance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export suppliers to CSV.
     */
    public function export(Request $request)
    {
        try {
            $query = Supplier::withCount('inventoryItems');
            
            // Apply same filters as index method
            if ($search = $request->input('search')) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('contact_person', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }
            
            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }
            
            $suppliers = $query->orderBy('name')->get();
            
            $filename = 'suppliers_export_' . now()->format('Y-m-d_H-i-s') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ];
            
            $callback = function() use ($suppliers) {
                $file = fopen('php://output', 'w');
                
                // Add CSV headers
                fputcsv($file, [
                    'ID',
                    'Name',
                    'Contact Person',
                    'Email',
                    'Phone',
                    'Address',
                    'Status',
                    'Inventory Items Count',
                    'Created At',
                    'Updated At'
                ]);
                
                // Add data rows
                foreach ($suppliers as $supplier) {
                    fputcsv($file, [
                        $supplier->id,
                        $supplier->name,
                        $supplier->contact_person,
                        $supplier->email,
                        $supplier->phone,
                        $supplier->address,
                        $supplier->status,
                        $supplier->inventory_items_count,
                        $supplier->created_at->format('Y-m-d H:i:s'),
                        $supplier->updated_at->format('Y-m-d H:i:s')
                    ]);
                }
                
                fclose($file);
            };
            
            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error exporting suppliers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}