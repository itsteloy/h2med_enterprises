<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\InventoryItem;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReportsController extends Controller
{
    /**
     * Generate comprehensive sales report with profit margin
     * DEFENSE MINUTES FIX: Added margin calculations, reporter name, company header, time range
     */
    public function salesReport(Request $request)
    {
        try {
            $dateFrom = $request->input('date_from', now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->input('date_to', now()->endOfMonth()->format('Y-m-d'));
            
            $user = $request->user();
            
            $transactions = Transaction::with(['items.inventoryItem', 'user'])
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->get();
            
            $totalRevenue = $transactions->sum('total');
            $totalCost = 0;
            $itemsBreakdown = [];
            
            foreach ($transactions as $transaction) {
                foreach ($transaction->items as $item) {
                    $cost = $item->inventoryItem->cost ?? 0;
                    $itemCost = $cost * $item->quantity;
                    $totalCost += $itemCost;
                    
                    $itemName = $item->inventoryItem->name ?? 'Unknown Item';
                    if (!isset($itemsBreakdown[$itemName])) {
                        $itemsBreakdown[$itemName] = [
                            'name' => $itemName,
                            'sku' => $item->inventoryItem->sku ?? 'N/A',
                            'quantity_sold' => 0,
                            'revenue' => 0,
                            'cost' => 0,
                            'profit' => 0,
                        ];
                    }
                    
                    $itemsBreakdown[$itemName]['quantity_sold'] += $item->quantity;
                    $itemsBreakdown[$itemName]['revenue'] += $item->total_price;
                    $itemsBreakdown[$itemName]['cost'] += $itemCost;
                    $itemsBreakdown[$itemName]['profit'] += ($item->total_price - $itemCost);
                }
            }
            
            $grossProfit = $totalRevenue - $totalCost;
            $profitMargin = $totalRevenue > 0 
                ? ($grossProfit / $totalRevenue) * 100 
                : 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'report_header' => [
                        'company_name' => 'H2-MED Enterprises',
                        'report_type' => 'Sales Report',
                        'period' => [
                            'from' => $dateFrom,
                            'to' => $dateTo,
                            'formatted' => Carbon::parse($dateFrom)->format('M d, Y') . ' - ' . Carbon::parse($dateTo)->format('M d, Y')
                        ],
                        'generated_by' => [
                            'name' => $user->name,
                            'role' => ucfirst($user->role)
                        ],
                        'generated_at' => now()->format('Y-m-d H:i:s'),
                        'generated_at_formatted' => now()->format('M d, Y h:i A')
                    ],
                    'summary' => [
                        'total_transactions' => $transactions->count(),
                        'total_revenue' => round($totalRevenue, 2),
                        'total_cost' => round($totalCost, 2),
                        'gross_profit' => round($grossProfit, 2),
                        'profit_margin_percentage' => round($profitMargin, 2),
                        'average_transaction_value' => $transactions->count() > 0 
                            ? round($totalRevenue / $transactions->count(), 2) 
                            : 0,
                        'total_items_sold' => $transactions->sum(function($t) {
                            return $t->items->sum('quantity');
                        }),
                        'total_discount_given' => round($transactions->sum('discount_amount'), 2),
                        'payment_methods' => [
                            'cash' => $transactions->where('payment_method', 'cash')->count(),
                            'card' => $transactions->where('payment_method', 'card')->count(),
                            'gcash' => $transactions->where('payment_method', 'gcash')->count(),
                        ],
                        'discount_transactions' => [
                            'senior_citizen' => $transactions->where('is_senior_citizen', true)->count(),
                            'pwd' => $transactions->where('is_pwd', true)->count(),
                            'general' => $transactions->where('discount_amount', '>', 0)
                                ->where('is_senior_citizen', false)
                                ->where('is_pwd', false)->count(),
                        ]
                    ],
                    'items_breakdown' => array_values($itemsBreakdown),
                    'transactions' => $transactions->map(function($transaction) {
                        return [
                            'receipt_number' => $transaction->receipt_number,
                            'date' => $transaction->created_at->format('Y-m-d H:i:s'),
                            'customer_name' => $transaction->customer_name ?? 'Walk-in',
                            'subtotal' => $transaction->subtotal,
                            'discount' => $transaction->discount_amount,
                            'discount_type' => $transaction->discount_type,
                            'total' => $transaction->total,
                            'payment_method' => $transaction->payment_method,
                            'cashier' => $transaction->user?->name ?? 'Unknown',
                            'items_count' => $transaction->items->count(),
                        ];
                    })
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating sales report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate sales report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate inventory report with batch information
     * DEFENSE MINUTES FIX: Include batch numbers, company header, reporter info
     */
    public function inventoryReport(Request $request)
    {
        try {
            $user = $request->user();
            
            $inventory = InventoryItem::with(['category', 'supplier'])
                ->where('status', 'active')
                ->get()
                ->map(function($item) {
                    return [
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'batch_number' => $item->batch_number ?? 'N/A',
                        'category' => $item->category?->name ?? 'Uncategorized',
                        'supplier' => $item->supplier?->name ?? 'No Supplier',
                        'stock_quantity' => $item->stock_quantity,
                        'minimum_stock' => $item->minimum_stock,
                        'unit' => $item->unit,
                        'cost' => $item->cost,
                        'price' => $item->price,
                        'total_cost_value' => round($item->stock_quantity * $item->cost, 2),
                        'total_selling_value' => round($item->stock_quantity * $item->price, 2),
                        'potential_profit' => round($item->stock_quantity * ($item->price - $item->cost), 2),
                        'expiry_date' => $item->expiry_date ? $item->expiry_date->format('Y-m-d') : null,
                        'status' => $item->getStockStatus(),
                    ];
                });
            
            $totalCostValue = $inventory->sum('total_cost_value');
            $totalSellingValue = $inventory->sum('total_selling_value');
            $potentialProfit = $inventory->sum('potential_profit');
            
            return response()->json([
                'success' => true,
                'data' => [
                    'report_header' => [
                        'company_name' => 'H2-MED Enterprises',
                        'report_type' => 'Inventory Report',
                        'generated_by' => [
                            'name' => $user->name,
                            'role' => ucfirst($user->role)
                        ],
                        'generated_at' => now()->format('Y-m-d H:i:s'),
                        'generated_at_formatted' => now()->format('M d, Y h:i A')
                    ],
                    'summary' => [
                        'total_items' => $inventory->count(),
                        'total_cost_value' => round($totalCostValue, 2),
                        'total_selling_value' => round($totalSellingValue, 2),
                        'potential_profit' => round($potentialProfit, 2),
                        'profit_margin_percentage' => $totalSellingValue > 0 
                            ? round(($potentialProfit / $totalSellingValue) * 100, 2) 
                            : 0,
                        'in_stock' => $inventory->where('stock_quantity', '>', 0)->count(),
                        'low_stock' => $inventory->where('status', 'Low Stock')->count(),
                        'out_of_stock' => $inventory->where('stock_quantity', 0)->count(),
                    ],
                    'inventory' => $inventory
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating inventory report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate inventory report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get per-cashier sales statistics
     * DEFENSE MINUTES FIX: Track transactions per cashier/shift
     */
    public function cashierPerformance(Request $request)
    {
        try {
            $dateFrom = $request->input('date_from', now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->input('date_to', now()->endOfMonth()->format('Y-m-d'));
            
            $cashierStats = Transaction::with('user')
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->get()
                ->groupBy('user_id')
                ->map(function($transactions, $userId) {
                    $user = $transactions->first()->user;
                    return [
                        'cashier_id' => $userId,
                        'cashier_name' => $user?->name ?? 'Unknown',
                        'cashier_role' => $user?->role ?? 'N/A',
                        'total_transactions' => $transactions->count(),
                        'total_sales' => round($transactions->sum('total'), 2),
                        'average_transaction' => round($transactions->avg('total'), 2),
                        'total_items_sold' => $transactions->sum(function($t) {
                            return $t->items->sum('quantity');
                        }),
                        'discount_transactions' => $transactions->filter(function($t) {
                            return $t->hasDiscount();
                        })->count(),
                        'payment_methods' => [
                            'cash' => $transactions->where('payment_method', 'cash')->count(),
                            'card' => $transactions->where('payment_method', 'card')->count(),
                            'gcash' => $transactions->where('payment_method', 'gcash')->count(),
                        ]
                    ];
                })->values();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $dateFrom,
                        'to' => $dateTo
                    ],
                    'cashiers' => $cashierStats
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating cashier performance report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate cashier performance report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}