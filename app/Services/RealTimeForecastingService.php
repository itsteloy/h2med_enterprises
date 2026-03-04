<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use App\Events\TransactionCompleted;
use App\Events\InventoryUpdated;
use App\Models\Transaction;
use App\Models\InventoryItem;

class RealTimeForecastingService extends AzureOpenAIService
{
    /**
     * Enhanced real-time forecasting configuration
     */
    private $realtimeConfig = [
        'auto_update_triggers' => [
            'significant_sales_change' => 0.15, // 15% change triggers update
            'inventory_threshold' => 0.20,      // 20% inventory change
            'time_based_update' => 60,          // Minutes
        ],
        'cache_invalidation' => [
            'sales_impact_threshold' => 1000,   // PHP amount
            'inventory_change_threshold' => 10, // Units
            'transaction_count_threshold' => 5, // Number of transactions
        ],
        'priority_forecasting' => [
            'critical_items' => true,   // Low stock items get priority
            'high_value_items' => true, // High-value items get priority
            'trending_items' => true,   // Fast-moving items get priority
        ]
    ];

    /**
     * Real-time forecast update based on new transaction
     */
    public function updateForecastOnTransaction($transaction)
    {
        Log::info('Real-time forecast update triggered by transaction: ' . $transaction->id);

        // Check if this transaction is significant enough to update forecasts
        if ($this->isSignificantTransaction($transaction)) {

            // Invalidate relevant caches
            $this->invalidateRelevantCaches($transaction);

            // Trigger immediate forecast updates for critical items
            $this->priorityForecastUpdate($transaction);

            // Update real-time metrics
            $this->updateRealTimeMetrics($transaction);
        }
    }

    /**
     * Real-time forecast update based on inventory changes
     */
    public function updateForecastOnInventoryChange($inventoryItem, $oldQuantity, $newQuantity)
    {
        Log::info('Real-time forecast update triggered by inventory change: ' . $inventoryItem->id);

        $quantityChange = abs($newQuantity - $oldQuantity);
        $changePercentage = $oldQuantity > 0 ? ($quantityChange / $oldQuantity) : 1;

        // Check if inventory change is significant
        if ($changePercentage >= $this->realtimeConfig['auto_update_triggers']['inventory_threshold']) {

            // Invalidate inventory-related caches
            Cache::forget('inventory_forecast_' . md5(json_encode(['item_id' => $inventoryItem->id])));

            // If item is now low stock, trigger immediate demand forecast
            if ($newQuantity <= $inventoryItem->minimum_stock) {
                $this->triggerLowStockForecast($inventoryItem);
            }
        }
    }

    /**
     * Get real-time forecast with auto-update
     */
    public function getRealTimeSalesForecast($historicalData, $months, $forceUpdate = false)
    {
        $cacheKey = 'realtime_sales_forecast_' . md5(json_encode($historicalData) . $months);

        // Check if we need real-time update
        if ($forceUpdate || $this->needsRealTimeUpdate('sales')) {
            Log::info('Generating real-time sales forecast');

            // Clear old cache
            Cache::forget($cacheKey);

            // Generate new forecast with current data
            $forecast = $this->generateSalesForecast($historicalData, $months);

            // Cache with shorter duration for real-time updates
            Cache::put($cacheKey, $forecast, now()->addMinutes(30));

            return $forecast;
        }

        // Return cached if available
        return Cache::get($cacheKey) ?: $this->generateSalesForecast($historicalData, $months);
    }

    /**
     * Get real-time inventory forecast with smart updates
     */
    public function getRealTimeInventoryForecast($inventoryData, $salesData, $forceUpdate = false)
    {
        $cacheKey = 'realtime_inventory_forecast_' . md5(json_encode($inventoryData));

        // Check for critical stock levels
        $criticalItems = $this->identifyCriticalItems($inventoryData);

        if ($forceUpdate || !empty($criticalItems) || $this->needsRealTimeUpdate('inventory')) {
            Log::info('Generating real-time inventory forecast for ' . count($criticalItems) . ' critical items');

            Cache::forget($cacheKey);

            $forecast = $this->generateInventoryForecast($inventoryData, $salesData);

            // Add real-time alerts for critical items
            $forecast['critical_alerts'] = $this->generateCriticalAlerts($criticalItems);
            $forecast['last_updated'] = now()->toISOString();
            $forecast['is_realtime'] = true;

            // Shorter cache for critical situations
            $cacheDuration = !empty($criticalItems) ? 15 : 60; // 15 or 60 minutes
            Cache::put($cacheKey, $forecast, now()->addMinutes($cacheDuration));

            return $forecast;
        }

        return Cache::get($cacheKey) ?: $this->generateInventoryForecast($inventoryData, $salesData);
    }

    /**
     * Real-time dashboard metrics
     */
    public function getRealTimeDashboardMetrics()
    {
        $cacheKey = 'realtime_dashboard_metrics';
        $cacheDuration = 5; // 5 minutes for dashboard

        return Cache::remember($cacheKey, now()->addMinutes($cacheDuration), function () {
            return [
                'live_sales_velocity' => $this->calculateCurrentSalesVelocity(),
                'inventory_burn_rate' => $this->calculateInventoryBurnRate(),
                'demand_spikes' => $this->detectDemandSpikes(),
                'stock_alerts' => $this->getActiveStockAlerts(),
                'forecast_accuracy' => $this->calculateRecentAccuracy(),
                'trending_products' => $this->getTrendingProducts(),
                'last_updated' => now()->toISOString(),
                'update_frequency' => '5 minutes'
            ];
        });
    }

    /**
     * Check if transaction is significant enough to trigger updates
     */
    private function isSignificantTransaction($transaction)
    {
        $threshold = $this->realtimeConfig['cache_invalidation']['sales_impact_threshold'];

        return $transaction->total >= $threshold ||
            $transaction->items()->count() >= $this->realtimeConfig['cache_invalidation']['transaction_count_threshold'];
    }

    /**
     * Invalidate relevant caches based on transaction
     */
    private function invalidateRelevantCaches($transaction)
    {
        // Get affected categories from transaction items
        $categories = $transaction->items()
            ->with('inventoryItem.category')
            ->get()
            ->pluck('inventoryItem.category.id')
            ->unique();

        // Invalidate sales forecast cache
        Cache::flush(); // In production, use more targeted cache invalidation

        Log::info('Invalidated forecast caches for categories: ' . $categories->implode(','));
    }

    /**
     * Priority forecast update for critical items
     */
    private function priorityForecastUpdate($transaction)
    {
        // Identify high-impact items from this transaction
        $highImpactItems = $transaction->items()
            ->with('inventoryItem')
            ->get()
            ->filter(function ($item) {
                return $item->inventoryItem->stock_quantity <= $item->inventoryItem->minimum_stock * 1.5;
            });

        if ($highImpactItems->isNotEmpty()) {
            Log::info('Triggering priority forecast for ' . $highImpactItems->count() . ' critical items');

            // Generate focused forecast for these items
            foreach ($highImpactItems as $item) {
                $this->generateItemSpecificForecast($item->inventoryItem);
            }
        }
    }

    /**
     * Check if real-time update is needed
     */
    private function needsRealTimeUpdate($type)
    {
        $lastUpdate = Cache::get("last_realtime_update_{$type}");
        $updateInterval = $this->realtimeConfig['auto_update_triggers']['time_based_update'];

        return !$lastUpdate || $lastUpdate->diffInMinutes(now()) >= $updateInterval;
    }

    /**
     * Identify critical items requiring immediate attention
     */
    private function identifyCriticalItems($inventoryData)
    {
        $critical = [];

        foreach ($inventoryData as $categoryName => $categoryData) {
            if (isset($categoryData['items'])) {
                foreach ($categoryData['items'] as $item) {
                    if ($item['stock_quantity'] <= $item['minimum_stock']) {
                        $critical[] = [
                            'item_id' => $item['id'],
                            'name' => $item['name'],
                            'category' => $categoryName,
                            'current_stock' => $item['stock_quantity'],
                            'minimum_stock' => $item['minimum_stock'],
                            'criticality' => 'high'
                        ];
                    }
                }
            }
        }

        return $critical;
    }

    /**
     * Generate critical alerts for real-time monitoring
     */
    private function generateCriticalAlerts($criticalItems)
    {
        $alerts = [];

        foreach ($criticalItems as $item) {
            $alerts[] = [
                'type' => 'low_stock',
                'severity' => 'high',
                'item_name' => $item['name'],
                'message' => "Critical: {$item['name']} has only {$item['current_stock']} units left",
                'action_needed' => 'immediate_reorder',
                'estimated_stockout' => $this->estimateStockoutDate($item),
                'timestamp' => now()->toISOString()
            ];
        }

        return $alerts;
    }

    /**
     * Calculate current sales velocity (real-time)
     */
    private function calculateCurrentSalesVelocity()
    {
        $recentSales = Transaction::where('created_at', '>=', now()->subHours(2))
            ->where('status', 'completed')
            ->sum('total');

        $hourlyRate = $recentSales / 2; // Average per hour

        return [
            'current_hourly_rate' => $hourlyRate,
            'projected_daily' => $hourlyRate * 24,
            'trend' => $this->compareToPreviousPeriod($hourlyRate),
            'last_calculated' => now()->toISOString()
        ];
    }

    /**
     * Calculate inventory burn rate
     */
    private function calculateInventoryBurnRate()
    {
        // Calculate average daily consumption for top 10 products
        $topProducts = InventoryItem::orderBy('stock_quantity', 'desc')
            ->limit(10)
            ->get();

        $burnRates = [];

        foreach ($topProducts as $product) {
            $dailyConsumption = $this->calculateDailyConsumption($product);
            $daysRemaining = $dailyConsumption > 0 ? $product->stock_quantity / $dailyConsumption : 999;

            $burnRates[] = [
                'product' => $product->name,
                'daily_consumption' => $dailyConsumption,
                'days_remaining' => round($daysRemaining, 1),
                'status' => $daysRemaining < 7 ? 'critical' : ($daysRemaining < 14 ? 'warning' : 'ok')
            ];
        }

        return $burnRates;
    }

    /**
     * Detect demand spikes in real-time
     */
    private function detectDemandSpikes()
    {
        $currentHourSales = Transaction::where('created_at', '>=', now()->startOfHour())
            ->where('status', 'completed')
            ->count();

        $averageHourlySales = Transaction::where('created_at', '>=', now()->subDays(7))
            ->where('status', 'completed')
            ->count() / (7 * 24);

        $spikeThreshold = $averageHourlySales * 2; // 200% of average

        return [
            'current_hour_transactions' => $currentHourSales,
            'average_hourly' => round($averageHourlySales, 1),
            'is_spike' => $currentHourSales > $spikeThreshold,
            'spike_magnitude' => $averageHourlySales > 0 ? ($currentHourSales / $averageHourlySales) : 1,
            'detected_at' => now()->toISOString()
        ];
    }

    /**
     * Update real-time metrics after transaction
     */
    private function updateRealTimeMetrics($transaction)
    {
        Cache::put("last_realtime_update_sales", now(), now()->addHour());

        // Update live dashboard metrics
        $currentMetrics = Cache::get('realtime_dashboard_metrics', []);
        $currentMetrics['last_transaction'] = [
            'id' => $transaction->id,
            'amount' => $transaction->total,
            'timestamp' => $transaction->created_at->toISOString()
        ];

        Cache::put('realtime_dashboard_metrics', $currentMetrics, now()->addMinutes(5));
    }

    /**
     * Helper methods for calculations
     */
    private function calculateDailyConsumption($product)
    {
        // Calculate based on last 7 days of stock movements
        $consumption = \App\Models\StockMovement::where('inventory_item_id', $product->id)
            ->where('type', 'out')
            ->where('created_at', '>=', now()->subDays(7))
            ->sum('quantity');

        return $consumption / 7; // Daily average
    }

    private function estimateStockoutDate($item)
    {
        $dailyConsumption = $this->calculateDailyConsumption($item);

        if ($dailyConsumption <= 0) {
            return null;
        }

        $daysRemaining = $item['current_stock'] / $dailyConsumption;

        return now()->addDays(ceil($daysRemaining))->toDateString();
    }

    private function compareToPreviousPeriod($currentRate)
    {
        // Compare to same time yesterday
        $previousRate = Transaction::where('created_at', '>=', now()->subDay()->subHours(2))
            ->where('created_at', '<', now()->subDay())
            ->where('status', 'completed')
            ->sum('total') / 2;

        if ($previousRate == 0) return 'no_data';

        $change = (($currentRate - $previousRate) / $previousRate) * 100;

        return $change > 10 ? 'increasing' : ($change < -10 ? 'decreasing' : 'stable');
    }

    /**
     * Trigger low stock forecast for a specific item
     */
    private function triggerLowStockForecast($inventoryItem)
    {
        Log::info('Triggering low stock forecast for item: ' . $inventoryItem->id);

        // Generate demand forecast for the low-stock item
        $forecast = [
            'item_id' => $inventoryItem->id,
            'item_name' => $inventoryItem->name,
            'current_stock' => $inventoryItem->stock_quantity,
            'minimum_stock' => $inventoryItem->minimum_stock,
            'status' => 'critical',
            'suggested_reorder' => $this->calculateSuggestedReorder($inventoryItem),
            'timestamp' => now()->toISOString()
        ];

        // Store alert for immediate processing
        Cache::put("low_stock_alert_{$inventoryItem->id}", $forecast, now()->addHours(24));
    }

    /**
     * Get active stock alerts
     */
    private function getActiveStockAlerts()
    {
        $alerts = [];

        $criticalItems = InventoryItem::whereRaw('stock_quantity <= minimum_stock')
            ->get();

        foreach ($criticalItems as $item) {
            $alerts[] = [
                'item_id' => $item->id,
                'item_name' => $item->name,
                'current_stock' => $item->stock_quantity,
                'alert_type' => 'critical_low_stock',
                'created_at' => now()->toISOString()
            ];
        }

        return $alerts;
    }

    /**
     * Calculate recent forecast accuracy
     */
    private function calculateRecentAccuracy()
    {
        // Calculate accuracy based on recent forecasts vs actual results
        $recentTransactions = Transaction::where('created_at', '>=', now()->subDays(7))
            ->where('status', 'completed')
            ->count();

        $forecastedTransactions = Cache::get('recent_forecast_transactions', 0);

        if ($forecastedTransactions == 0) {
            return 0;
        }

        $accuracy = min(100, ($recentTransactions / $forecastedTransactions) * 100);

        return round($accuracy, 2);
    }

    /**
     * Get trending products based on recent sales
     */
    private function getTrendingProducts()
    {
        $trending = \App\Models\TransactionItem::with('inventoryItem')
            ->where('created_at', '>=', now()->subDays(7))
            ->selectRaw('inventory_item_id, SUM(quantity) as total_sales, COUNT(*) as sale_count')
            ->groupBy('inventory_item_id')
            ->orderByDesc('total_sales')
            ->limit(5)
            ->get();

        return $trending->map(function ($item) {
            return [
                'item_id' => $item->inventory_item_id,
                'item_name' => $item->inventoryItem->name ?? 'Unknown',
                'total_sales' => $item->total_sales,
                'sale_count' => $item->sale_count,
                'trend' => 'up'
            ];
        })->toArray();
    }

    /**
     * Generate forecast for a specific item
     */
    private function generateItemSpecificForecast($inventoryItem)
    {
        Log::info('Generating item-specific forecast for: ' . $inventoryItem->id);

        $historicalData = [
            'item_id' => $inventoryItem->id,
            'name' => $inventoryItem->name,
            'current_stock' => $inventoryItem->stock_quantity,
            'minimum_stock' => $inventoryItem->minimum_stock
        ];

        $forecast = [
            'item_id' => $inventoryItem->id,
            'item_name' => $inventoryItem->name,
            'predicted_demand' => $this->calculateDailyConsumption($inventoryItem),
            'reorder_point' => $this->calculateSuggestedReorder($inventoryItem),
            'safety_stock' => $inventoryItem->minimum_stock,
            'forecast_date' => now()->toISOString()
        ];

        // Cache this forecast
        Cache::put("item_forecast_{$inventoryItem->id}", $forecast, now()->addHours(6));

        return $forecast;
    }

    /**
     * Calculate suggested reorder quantity
     */
    private function calculateSuggestedReorder($inventoryItem)
    {
        $dailyConsumption = $this->calculateDailyConsumption($inventoryItem);
        $leadTime = 7; // Assume 7 days lead time

        $reorderPoint = ($dailyConsumption * $leadTime) + $inventoryItem->minimum_stock;

        return ceil($reorderPoint);
    }
}
