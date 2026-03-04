<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    /**
     * Display a listing of transactions.
     * DEFENSE MINUTES FIX: Ensure numeric fields are properly formatted to prevent frontend errors
     */
    public function index(Request $request)
    {
        try {
            $query = Transaction::with(['user:id,name', 'items.inventoryItem:id,name,sku']);
            
            // Apply date filter
            if ($request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            
            if ($request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }
            
            // Apply payment method filter
            if ($request->payment_method) {
                $query->where('payment_method', $request->payment_method);
            }
            
            // Apply status filter
            if ($request->status) {
                $query->where('status', $request->status);
            }
            
            // Apply discount type filter
            if ($request->discount_type) {
                switch ($request->discount_type) {
                    case 'senior':
                        $query->where('is_senior_citizen', true);
                        break;
                    case 'pwd':
                        $query->where('is_pwd', true);
                        break;
                    case 'general':
                        $query->where('discount_rate', '>', 0)
                              ->where('is_senior_citizen', false)
                              ->where('is_pwd', false);
                        break;
                    case 'none':
                        $query->where('is_senior_citizen', false)
                              ->where('is_pwd', false)
                              ->where(function($q) {
                                  $q->whereNull('discount_rate')->orWhere('discount_rate', 0);
                              });
                        break;
                }
            }
            
            // Apply search filter
            if ($search = $request->search) {
                $query->where(function($q) use ($search) {
                    $q->where('receipt_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%");
                });
            }
            
            // Apply sorting
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);
            
            $transactions = $query->paginate($request->per_page ?? 15);
            
            // DEFENSE MINUTES FIX: Format numeric fields to prevent "amount.toFixed is not a function" errors
            $formattedTransactions = $transactions->getCollection()->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'receipt_number' => $transaction->receipt_number,
                    'customer_name' => $transaction->customer_name,
                    'subtotal' => (float) ($transaction->subtotal ?? 0),
                    'discount_rate' => (float) ($transaction->discount_rate ?? 0),
                    'discount_amount' => (float) ($transaction->discount_amount ?? 0),
                    'vat' => (float) ($transaction->vat ?? 0),
                    'total' => (float) ($transaction->total ?? 0),
                    'payment_method' => $transaction->payment_method,
                    'cash_amount' => (float) ($transaction->cash_amount ?? 0),
                    'change_amount' => (float) ($transaction->change_amount ?? 0),
                    'status' => $transaction->status,
                    'is_senior_citizen' => (bool) $transaction->is_senior_citizen,
                    'senior_id' => $transaction->senior_id,
                    'is_pwd' => (bool) $transaction->is_pwd,
                    'pwd_id' => $transaction->pwd_id,
                    'created_at' => $transaction->created_at->toISOString(),
                    'updated_at' => $transaction->updated_at->toISOString(),
                    'user' => $transaction->user,
                    'items' => $transaction->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'sku' => $item->sku,
                            'name' => $item->name,
                            'quantity' => $item->quantity,
                            'unit_price' => (float) $item->unit_price,
                            'total_price' => (float) $item->total_price,
                            'inventoryItem' => $item->inventoryItem ? [
                                'id' => $item->inventoryItem->id,
                                'name' => $item->inventoryItem->name,
                                'sku' => $item->inventoryItem->sku,
                                'price' => (float) $item->inventoryItem->price
                            ] : null
                        ];
                    })
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedTransactions,
                'pagination' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'per_page' => $transactions->perPage(),
                    'total' => $transactions->total(),
                    'from' => $transactions->firstItem(),
                    'to' => $transactions->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching transactions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process a new transaction with discount support.
     * DEFENSE MINUTES FIX: Added senior_id and pwd_id validation, support for both field name formats
     */
    public function processTransaction(Request $request)
    {
        try {
            Log::info('Processing transaction', ['data' => $request->all()]);

            $validator = Validator::make($request->all(), [
                'items' => 'required|array|min:1',
                'items.*.id' => 'sometimes|exists:inventory_items,id',
                'items.*.inventory_item_id' => 'sometimes|exists:inventory_items,id', // DEFENSE MINUTES FIX: Support both formats
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'nullable|numeric|min:0', // DEFENSE MINUTES FIX: Allow frontend to send unit_price
                'payment_method' => 'required|in:cash,card,gcash',
                'customer_name' => 'nullable|string|max:255',
                'is_senior_citizen' => 'nullable|boolean',
                'senior_id' => 'required_if:is_senior_citizen,true|nullable|string|max:50', // DEFENSE MINUTES FIX: Required when senior
                'is_pwd' => 'nullable|boolean',
                'pwd_id' => 'required_if:is_pwd,true|nullable|string|max:50', // DEFENSE MINUTES FIX: Required when PWD
                'discount_rate' => 'nullable|numeric|min:0|max:0.5', // Max 50% discount
                'discount_amount' => 'nullable|numeric|min:0',
                'subtotal' => 'required|numeric|min:0',
                'vat' => 'required|numeric|min:0', // DEFENSE MINUTES FIX: VAT is required
                'total' => 'required|numeric|min:0',
                'cash_amount' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                Log::error('Transaction validation failed', [
                    'errors' => $validator->errors()->toArray(),
                    'data' => $request->all()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Calculate original subtotal from items
            $calculatedSubtotal = 0;
            $itemsData = [];
            
            foreach ($request->items as $item) {
                // DEFENSE MINUTES FIX: Support both 'id' and 'inventory_item_id' field names
                $itemId = $item['inventory_item_id'] ?? $item['id'];
                $inventoryItem = InventoryItem::findOrFail($itemId);
                
                // Check stock availability
                if ($inventoryItem->stock_quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock for {$inventoryItem->name}. Available: {$inventoryItem->stock_quantity}, Requested: {$item['quantity']}");
                }
                
                // DEFENSE MINUTES FIX: Use provided unit_price if available, otherwise use inventory item price
                $unitPrice = $item['unit_price'] ?? $inventoryItem->price;
                $itemTotal = $item['quantity'] * $unitPrice;
                $calculatedSubtotal += $itemTotal;
                
                $itemsData[] = [
                    'inventory_item' => $inventoryItem,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $itemTotal
                ];
            }

            // Handle discount calculation
            $discountRate = 0;
            $discountAmount = 0;
            $isSeniorCitizen = $request->boolean('is_senior_citizen', false);
            $isPWD = $request->boolean('is_pwd', false);
            
            // Apply discount logic
            if ($isSeniorCitizen || $isPWD) {
                $discountRate = 0.20; // 20% discount for senior/PWD
                $discountAmount = $calculatedSubtotal * $discountRate;
            } elseif ($request->filled('discount_rate') && $request->discount_rate > 0) {
                $discountRate = $request->discount_rate;
                $discountAmount = $calculatedSubtotal * $discountRate;
            } elseif ($request->filled('discount_amount') && $request->discount_amount > 0) {
                $discountAmount = $request->discount_amount;
                $discountRate = $calculatedSubtotal > 0 ? $discountAmount / $calculatedSubtotal : 0;
            }
            
            // Ensure discount doesn't exceed subtotal
            $discountAmount = min($discountAmount, $calculatedSubtotal);
            
            $discountedSubtotal = $calculatedSubtotal - $discountAmount;
            
            // DEFENSE MINUTES FIX: Use provided VAT or calculate (12% in Philippines)
            $vat = $request->vat ?? ($discountedSubtotal * 0.12);
            $total = $request->total ?? ($discountedSubtotal + $vat);
            
            $change = 0;
            if ($request->payment_method === 'cash' && $request->cash_amount) {
                $change = $request->cash_amount - $total;
                if ($change < 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient cash amount'
                    ], 400);
                }
            }

            // Create transaction with discount information
            // DEFENSE MINUTES FIX: Include senior_id and pwd_id fields
            $transaction = Transaction::create([
                'receipt_number' => Transaction::generateReceiptNumber(),
                'customer_name' => $request->customer_name,
                'subtotal' => $calculatedSubtotal, // Original subtotal before discount
                'discount_rate' => $discountRate,
                'discount_amount' => $discountAmount,
                'vat' => $vat,
                'total' => $total,
                'payment_method' => $request->payment_method,
                'cash_amount' => $request->cash_amount,
                'change_amount' => $change,
                'status' => 'completed',
                'is_senior_citizen' => $isSeniorCitizen,
                'senior_id' => $request->senior_id, // DEFENSE MINUTES FIX
                'is_pwd' => $isPWD,
                'pwd_id' => $request->pwd_id, // DEFENSE MINUTES FIX
                'user_id' => Auth::id(),
            ]);

            // Process each item
            foreach ($itemsData as $itemData) {
                $inventoryItem = $itemData['inventory_item'];
                
                // Create transaction item
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'inventory_item_id' => $inventoryItem->id,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemData['total_price']
                ]);

                // Update stock and create movement record
                $previousStock = $inventoryItem->stock_quantity;
                $inventoryItem->decrement('stock_quantity', $itemData['quantity']);

                StockMovement::create([
                    'inventory_item_id' => $inventoryItem->id,
                    'user_id' => Auth::id(),
                    'type' => 'out',
                    'quantity' => $itemData['quantity'],
                    'previous_stock' => $previousStock,
                    'new_stock' => $inventoryItem->fresh()->stock_quantity,
                    'reason' => 'Sale - Receipt: ' . $transaction->receipt_number,
                    'reference_number' => $transaction->receipt_number,
                ]);
            }

            DB::commit();

            // Load the transaction with relationships for response
            $transaction->load(['items.inventoryItem', 'user']);

            Log::info('Transaction completed successfully', ['receipt_number' => $transaction->receipt_number]);

            return response()->json([
                'success' => true,
                'message' => 'Transaction completed successfully',
                'data' => $transaction
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Transaction failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Transaction failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified transaction.
     */
    public function show($id)
    {
        try {
            $transaction = Transaction::with([
                'user:id,name',
                'items.inventoryItem:id,name,sku,price'
            ])->findOrFail($id);
            
            // Format the response to include inventoryItem data properly
            $formattedTransaction = [
                'id' => $transaction->id,
                'receipt_number' => $transaction->receipt_number,
                'customer_name' => $transaction->customer_name,
                'subtotal' => (float) ($transaction->subtotal ?? 0),
                'discount_rate' => (float) ($transaction->discount_rate ?? 0),
                'discount_amount' => (float) ($transaction->discount_amount ?? 0),
                'vat' => (float) ($transaction->vat ?? 0),
                'total' => (float) ($transaction->total ?? 0),
                'payment_method' => $transaction->payment_method,
                'cash_amount' => (float) ($transaction->cash_amount ?? 0),
                'change_amount' => (float) ($transaction->change_amount ?? 0),
                'status' => $transaction->status,
                'is_senior_citizen' => (bool) $transaction->is_senior_citizen,
                'senior_id' => $transaction->senior_id,
                'is_pwd' => (bool) $transaction->is_pwd,
                'pwd_id' => $transaction->pwd_id,
                'created_at' => $transaction->created_at->toISOString(),
                'updated_at' => $transaction->updated_at->toISOString(),
                'user' => $transaction->user,
                'items' => $transaction->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                        'inventoryItem' => $item->inventoryItem ? [
                            'id' => $item->inventoryItem->id,
                            'name' => $item->inventoryItem->name,
                            'sku' => $item->inventoryItem->sku,
                            'price' => (float) $item->inventoryItem->price
                        ] : null
                    ];
                })
            ];
            
            return response()->json([
                'success' => true,
                'data' => $formattedTransaction
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching transaction: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Transaction not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Get transactions with discounts applied.
     */
    public function getTransactionsWithDiscounts(Request $request)
    {
        try {
            $query = Transaction::with(['items.inventoryItem', 'user:id,name'])
                ->where(function($q) {
                    $q->where('is_senior_citizen', true)
                      ->orWhere('is_pwd', true)
                      ->orWhere('discount_amount', '>', 0);
                });
            
            // Apply discount type filter
            if ($request->discount_type) {
                switch ($request->discount_type) {
                    case 'senior':
                        $query->where('is_senior_citizen', true);
                        break;
                    case 'pwd':
                        $query->where('is_pwd', true);
                        break;
                    case 'general':
                        $query->where('discount_rate', '>', 0)
                              ->where('is_senior_citizen', false)
                              ->where('is_pwd', false);
                        break;
                }
            }
            
            // Apply date filters
            if ($request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            
            if ($request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }
            
            $transactions = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);
            
            return response()->json([
                'success' => true,
                'data' => $transactions->items(),
                'pagination' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'per_page' => $transactions->perPage(),
                    'total' => $transactions->total()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching discounted transactions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve discounted transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction statistics.
     * DEFENSE MINUTES FIX: Cast all numeric values to float to prevent frontend errors
     */
    public function stats(Request $request)
    {
        try {
            $dateFrom = $request->date_from ?? now()->startOfMonth();
            $dateTo = $request->date_to ?? now()->endOfMonth();
            
            $baseQuery = Transaction::whereBetween('created_at', [$dateFrom, $dateTo]);
            
            $stats = [
                'total_transactions' => (clone $baseQuery)->count(),
                'total_sales' => (float) (clone $baseQuery)->sum('total'),
                'total_revenue' => (float) (clone $baseQuery)->sum('total'), // Alias for compatibility
                'total_items_sold' => TransactionItem::whereHas('transaction', function($query) use ($dateFrom, $dateTo) {
                    $query->whereBetween('created_at', [$dateFrom, $dateTo]);
                })->sum('quantity'),
                
                // Per-cashier transaction count for today
                'cashier_transactions_today' => Transaction::where('user_id', Auth::id())
                    ->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()])
                    ->count(),
                'average_transaction_value' => (float) (clone $baseQuery)->avg('total'),
                
                // Per-cashier transaction count for today
                'cashier_transactions_today' => Transaction::where('user_id', Auth::id())
                    ->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()])
                    ->count(),
                
                // Discount statistics
                'total_transactions' => (clone $baseQuery)->count(),
                'total_sales' => (float) (clone $baseQuery)->sum('total'),
                'total_revenue' => (float) (clone $baseQuery)->sum('total'), // Alias for compatibility
                'total_items_sold' => TransactionItem::whereHas('transaction', function($query) use ($dateFrom, $dateTo) {
                    $query->whereBetween('created_at', [$dateFrom, $dateTo]);
                })->sum('quantity'),
                'average_transaction_value' => (float) (clone $baseQuery)->avg('total'),
                
                // Discount statistics
                'total_discounts_given' => (float) (clone $baseQuery)->sum('discount_amount'),
                'total_discount' => (float) (clone $baseQuery)->sum('discount_amount'), // Alias for compatibility
                'transactions_with_discounts' => (clone $baseQuery)->where(function($q) {
                    $q->where('is_senior_citizen', true)
                      ->orWhere('is_pwd', true)
                      ->orWhere('discount_amount', '>', 0);
                })->count(),
                'senior_citizen_transactions' => (clone $baseQuery)->where('is_senior_citizen', true)->count(),
                'pwd_transactions' => (clone $baseQuery)->where('is_pwd', true)->count(),
                'general_discount_transactions' => (clone $baseQuery)->where('discount_rate', '>', 0)
                    ->where('is_senior_citizen', false)
                    ->where('is_pwd', false)
                    ->count(),
                
                // Transaction status breakdown
                'completed_transactions' => (clone $baseQuery)->where('status', 'completed')->count(),
                'voided_transactions' => (clone $baseQuery)->where('status', 'cancelled')->count(),
                
                // Payment method breakdown
                'cash_transactions' => (clone $baseQuery)->where('payment_method', 'cash')->count(),
                'card_transactions' => (clone $baseQuery)->where('payment_method', 'card')->count(),
                'gcash_transactions' => (clone $baseQuery)->where('payment_method', 'gcash')->count(),
                
                'payment_methods' => (clone $baseQuery)
                    ->selectRaw('payment_method, COUNT(*) as count, SUM(total) as total_amount')
                    ->groupBy('payment_method')
                    ->get()
                    ->map(function($item) {
                        return [
                            'payment_method' => $item->payment_method,
                            'count' => $item->count,
                            'total_amount' => (float) $item->total_amount
                        ];
                    }),
                    
                'daily_sales' => (clone $baseQuery)
                    ->selectRaw('DATE(created_at) as date, COUNT(*) as transactions, SUM(total) as total_sales, SUM(discount_amount) as total_discounts')
                    ->groupBy(DB::raw('DATE(created_at)'))
                    ->orderByDesc('date')
                    ->get()
                    ->map(function($item) {
                        return [
                            'date' => $item->date,
                            'transactions' => $item->transactions,
                            'total_sales' => (float) $item->total_sales,
                            'total_discounts' => (float) $item->total_discounts
                        ];
                    }),
                    
                'top_selling_items' => TransactionItem::with('inventoryItem:id,name,sku')
                    ->whereHas('transaction', function($query) use ($dateFrom, $dateTo) {
                        $query->whereBetween('created_at', [$dateFrom, $dateTo]);
                    })
                    ->selectRaw('inventory_item_id, SUM(quantity) as total_quantity, SUM(total_price) as total_revenue')
                    ->groupBy('inventory_item_id')
                    ->orderByDesc('total_quantity')
                    ->take(10)
                    ->get()
                    ->map(function($item) {
                        return [
                            'inventory_item_id' => $item->inventory_item_id,
                            'inventory_item' => $item->inventoryItem,
                            'total_quantity' => $item->total_quantity,
                            'total_revenue' => (float) $item->total_revenue
                        ];
                    }),
                    
                // Discount breakdown
                'discount_breakdown' => [
                    'senior_citizen_savings' => (float) (clone $baseQuery)->where('is_senior_citizen', true)->sum('discount_amount'),
                    'pwd_savings' => (float) (clone $baseQuery)->where('is_pwd', true)->sum('discount_amount'),
                    'general_discount_savings' => (float) (clone $baseQuery)->where('discount_rate', '>', 0)
                        ->where('is_senior_citizen', false)
                        ->where('is_pwd', false)
                        ->sum('discount_amount'),
                ]
            ];
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting transaction stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transaction statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Void/cancel a transaction.
     */
    public function voidTransaction($id, Request $request)
    {
        try {
            $transaction = Transaction::findOrFail($id);
            
            if ($transaction->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction is already cancelled'
                ], 400);
            }
            
            $validator = Validator::make($request->all(), [
                'reason' => 'nullable|string|max:500' // Made optional to match original
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();
            
            // Restore stock for each item
            foreach ($transaction->items as $item) {
                $inventoryItem = $item->inventoryItem;
                $previousStock = $inventoryItem->stock_quantity;
                $inventoryItem->increment('stock_quantity', $item->quantity);
                
                // Create stock movement record for the restoration
                StockMovement::create([
                    'inventory_item_id' => $item->inventory_item_id,
                    'user_id' => Auth::id(),
                    'type' => 'in',
                    'quantity' => $item->quantity,
                    'previous_stock' => $previousStock,
                    'new_stock' => $inventoryItem->fresh()->stock_quantity,
                    'reason' => 'Transaction Void - Receipt: ' . $transaction->receipt_number,
                    'notes' => $request->reason,
                    'reference_number' => $transaction->receipt_number,
                ]);
            }
            
            // Update transaction status
            $transaction->update([
                'status' => 'cancelled'
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Transaction voided successfully',
                'data' => $transaction->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error voiding transaction: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to void transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export transactions to CSV
     * DEFENSE MINUTES FIX: Added senior_id and pwd_id to export
     */
    public function export(Request $request)
    {
        try {
            $query = Transaction::with(['user:id,name', 'items']);
            
            // Apply same filters as index method
            if ($request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            
            if ($request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }
            
            if ($request->payment_method) {
                $query->where('payment_method', $request->payment_method);
            }
            
            if ($request->status) {
                $query->where('status', $request->status);
            }
            
            if ($search = $request->search) {
                $query->where(function($q) use ($search) {
                    $q->where('receipt_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%");
                });
            }
            
            $transactions = $query->orderBy('created_at', 'desc')->get();
            
            $filename = 'transactions_export_' . now()->format('Y-m-d_H-i-s') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ];
            
            $callback = function() use ($transactions) {
                $file = fopen('php://output', 'w');
                
                // Add CSV headers - DEFENSE MINUTES FIX: Include Senior ID and PWD ID
                fputcsv($file, [
                    'Receipt Number',
                    'Customer Name',
                    'Date',
                    'Cashier',
                    'Subtotal',
                    'Discount Type',
                    'Discount Rate (%)',
                    'Discount Amount',
                    'VAT',
                    'Total',
                    'Payment Method',
                    'Cash Amount',
                    'Change',
                    'Status',
                    'Items Count',
                    'Is Senior Citizen',
                    'Senior ID',
                    'Is PWD',
                    'PWD ID'
                ]);
                
                // Add data rows
                foreach ($transactions as $transaction) {
                    $discountType = 'None';
                    if ($transaction->is_senior_citizen) {
                        $discountType = 'Senior Citizen';
                    } elseif ($transaction->is_pwd) {
                        $discountType = 'PWD';
                    } elseif ($transaction->discount_rate > 0) {
                        $discountType = 'General Discount';
                    }
                    
                    fputcsv($file, [
                        $transaction->receipt_number,
                        $transaction->customer_name ?: 'Walk-in Customer',
                        $transaction->created_at->format('Y-m-d H:i:s'),
                        $transaction->user->name ?? 'Unknown',
                        number_format($transaction->subtotal, 2),
                        $discountType,
                        number_format(($transaction->discount_rate ?? 0) * 100, 2),
                        number_format($transaction->discount_amount ?? 0, 2),
                        number_format($transaction->vat, 2),
                        number_format($transaction->total, 2),
                        ucfirst($transaction->payment_method),
                        $transaction->cash_amount ? number_format($transaction->cash_amount, 2) : '',
                        $transaction->change_amount ? number_format($transaction->change_amount, 2) : '',
                        ucfirst($transaction->status),
                        $transaction->items->count(),
                        $transaction->is_senior_citizen ? 'Yes' : 'No',
                        $transaction->senior_id ?? '', // DEFENSE MINUTES FIX
                        $transaction->is_pwd ? 'Yes' : 'No',
                        $transaction->pwd_id ?? '' // DEFENSE MINUTES FIX
                    ]);
                }
                
                fclose($file);
            };
            
            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error exporting transactions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}