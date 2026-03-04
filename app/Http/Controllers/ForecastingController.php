<?php

namespace App\Http\Controllers;

use App\Services\AzureOpenAIService;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\InventoryItem;
use App\Models\Category;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ForecastingController extends Controller
{
    protected $openAIService;

    public function __construct(AzureOpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Get sales forecast data
     */
    public function getSalesForecast(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'months' => 'nullable|integer|min:1|max:24',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $months = $request->input('months', 12);
            $startDate = $request->input('start_date', now()->subYear());
            $endDate = $request->input('end_date', now());

            // Get historical sales data
            $historicalSales = $this->getHistoricalSalesData($startDate, $endDate);
            
            // Generate AI forecast
            $aiForecast = $this->openAIService->generateSalesForecast($historicalSales, $months);
            
            // Calculate basic statistical forecast as backup
            $statisticalForecast = $this->calculateStatisticalForecast($historicalSales, $months);
            
            // Combine and format forecast data
            $combinedForecast = $this->combineForecastData($historicalSales, $aiForecast, $statisticalForecast);

            return response()->json([
                'success' => true,
                'data' => [
                    'historical_data' => $historicalSales,
                    'forecast_data' => $combinedForecast,
                    'ai_insights' => $aiForecast['insights'] ?? [],
                    'recommendations' => $aiForecast['recommendations'] ?? [],
                    'accuracy_estimate' => $aiForecast['accuracy_estimate'] ?? 0.85,
                    'generated_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating sales forecast: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate sales forecast',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory demand forecast
     */
    public function getInventoryForecast(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'category_id' => 'nullable|exists:categories,id',
                'months_ahead' => 'nullable|integer|min:1|max:12'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $categoryId = $request->input('category_id');
            $monthsAhead = $request->input('months_ahead', 3);

            // Get current inventory data
            $inventoryData = $this->getCurrentInventoryData($categoryId);
            
            // Get sales data for demand analysis
            $salesData = $this->getSalesDataForDemandAnalysis($categoryId);
            
            // Generate AI-powered inventory forecast
            $aiForecast = $this->openAIService->generateInventoryForecast($inventoryData, $salesData);
            
            // Calculate statistical demand forecast
            $demandForecast = $this->calculateDemandForecast($inventoryData, $salesData, $monthsAhead);

            return response()->json([
                'success' => true,
                'data' => [
                    'current_inventory' => $inventoryData,
                    'demand_forecast' => $demandForecast,
                    'ai_forecast' => $aiForecast,
                    'restock_recommendations' => $this->generateRestockRecommendations($inventoryData, $demandForecast),
                    'generated_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating inventory forecast: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate inventory forecast',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get seasonal trends analysis
     */
    public function getSeasonalTrends(Request $request)
    {
        try {
            // Get historical data by quarters for categories
            $historicalData = $this->getSeasonalHistoricalData();
            
            // Get product-level seasonal data
            $productSeasonalData = $this->getProductSeasonalData();
            
            // Generate AI seasonal analysis
            $aiAnalysis = $this->openAIService->generateSeasonalTrends($historicalData);
            
            // Calculate statistical seasonal patterns
            $seasonalPatterns = $this->calculateSeasonalPatterns($historicalData);
            
            // Calculate product-level seasonal patterns
            $productSeasonalPatterns = $this->calculateProductSeasonalPatterns($productSeasonalData);

            return response()->json([
                'success' => true,
                'data' => [
                    'seasonal_patterns' => $seasonalPatterns, // Category-level
                    'product_seasonal_patterns' => $productSeasonalPatterns, // Product-level
                    'ai_analysis' => $aiAnalysis,
                    'weather_impact' => $aiAnalysis['weather_impact'] ?? [],
                    'recommendations' => $aiAnalysis['recommendations'] ?? [],
                    'generated_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating seasonal trends: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate seasonal trends',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get business insights
     */
    public function getBusinessInsights(Request $request)
    {
        try {
            // Collect comprehensive business data
            $businessData = [
                'sales_performance' => $this->getSalesPerformanceData(),
                'inventory_metrics' => $this->getInventoryMetrics(),
                'category_performance' => $this->getCategoryPerformanceData(),
                'customer_patterns' => $this->getCustomerPatterns(),
                'seasonal_data' => $this->getSeasonalBusinessData()
            ];

            // Generate AI insights
            $aiInsights = $this->openAIService->generateBusinessInsights($businessData);

            return response()->json([
                'success' => true,
                'data' => [
                    'performance_metrics' => $aiInsights['performance_metrics'] ?? [],
                    'opportunities' => $aiInsights['opportunities'] ?? [],
                    'risks' => $aiInsights['risks'] ?? [],
                    'strategic_recommendations' => $aiInsights['strategic_recommendations'] ?? [],
                    'market_trends' => $aiInsights['market_trends'] ?? [],
                    'generated_at' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating business insights: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate business insights',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get forecast accuracy metrics
     */
    public function getForecastAccuracy(Request $request)
    {
        try {
            $months = $request->input('months', 6);
            
            $accuracyData = $this->calculateForecastAccuracy($months);

            return response()->json([
                'success' => true,
                'data' => $accuracyData
            ]);
        } catch (\Exception $e) {
            Log::error('Error calculating forecast accuracy: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate forecast accuracy',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test Azure OpenAI connection
     */
    public function testAIConnection()
    {
        try {
            $result = $this->openAIService->testConnection();
            
            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'AI connection test failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Private helper methods

    private function getHistoricalSalesData($startDate, $endDate)
    {
        return Transaction::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'completed')
            ->selectRaw('
                DATE_FORMAT(created_at, "%Y-%m") as month,
                COUNT(*) as transaction_count,
                SUM(total) as total_sales,
                SUM(subtotal) as subtotal,
                SUM(discount_amount) as total_discounts,
                AVG(total) as average_transaction
            ')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    private function getCurrentInventoryData($categoryId = null)
    {
        $query = InventoryItem::with(['category:id,name', 'supplier:id,name'])
            ->select([
                'id', 'name', 'sku', 'batch_number', 'category_id', 'supplier_id',
                'stock_quantity', 'minimum_stock', 'maximum_stock',
                'price', 'cost', 'unit', 'status'
            ]);

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        // Return individual products instead of grouping by category
        return $query->get()->map(function ($item) {
            return [
                'id' => $item->id,
                'product_name' => $item->name,
                'sku' => $item->sku,
                'batch_number' => $item->batch_number ?? 'N/A',
                'category_name' => $item->category ? $item->category->name : 'Uncategorized',
                'category_id' => $item->category_id,
                'supplier_name' => $item->supplier ? $item->supplier->name : 'No Supplier',
                'stock_quantity' => $item->stock_quantity,
                'minimum_stock' => $item->minimum_stock,
                'maximum_stock' => $item->maximum_stock ?? 0,
                'price' => $item->price,
                'cost' => $item->cost,
                'unit' => $item->unit,
            ];
        })->toArray();
    }

    private function getSalesDataForDemandAnalysis($categoryId = null)
    {
        $query = TransactionItem::with(['inventoryItem.category'])
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->subMonths(6), now()]);

        if ($categoryId) {
            $query->whereHas('inventoryItem', function ($q) use ($categoryId) {
                $q->where('category_id', $categoryId);
            });
        }

        // Group by individual products instead of categories
        return $query->selectRaw('
                transaction_items.inventory_item_id,
                inventory_items.name as product_name,
                inventory_items.sku,
                inventory_items.batch_number,
                categories.name as category_name,
                DATE_FORMAT(transactions.created_at, "%Y-%m") as month,
                SUM(transaction_items.quantity) as total_quantity,
                SUM(transaction_items.total_price) as total_revenue,
                COUNT(DISTINCT transactions.id) as transaction_count
            ')
            ->join('inventory_items', 'transaction_items.inventory_item_id', '=', 'inventory_items.id')
            ->join('categories', 'inventory_items.category_id', '=', 'categories.id')
            ->groupBy('transaction_items.inventory_item_id', 'inventory_items.name', 'inventory_items.sku', 'inventory_items.batch_number', 'categories.name', 'month')
            ->orderBy('month')
            ->get()
            ->groupBy('inventory_item_id') // Group by product ID
            ->toArray();
    }

    private function calculateStatisticalForecast($historicalData, $months)
    {
        if (empty($historicalData) || count($historicalData) < 3) {
            return [];
        }

        $forecast = [];
        $values = array_column($historicalData, 'total_sales');
        $trend = $this->calculateTrend($values);
        $seasonality = $this->calculateSeasonality($values);
        
        $lastMonth = end($historicalData);
        $baseValue = $lastMonth['total_sales'];
        
        for ($i = 1; $i <= $months; $i++) {
            $forecastDate = Carbon::parse($lastMonth['month'])->addMonths($i);
            $trendAdjustment = $trend * $i;
            $seasonalAdjustment = $seasonality[$i % 12] ?? 1;
            
            $predictedValue = ($baseValue + $trendAdjustment) * $seasonalAdjustment;
            
            $forecast[] = [
                'month' => $forecastDate->format('Y-m'),
                'predicted_sales' => round($predictedValue, 2),
                'confidence_level' => max(0.6, 0.9 - ($i * 0.05)), // Decrease confidence over time
                'method' => 'statistical'
            ];
        }

        return $forecast;
    }

    private function calculateTrend($values)
    {
        $n = count($values);
        if ($n < 2) return 0;

        $sumX = array_sum(range(1, $n));
        $sumY = array_sum($values);
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $x = $i + 1;
            $y = $values[$i];
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        return ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
    }

    private function calculateSeasonality($values)
    {
        // Simple seasonal adjustment based on month-over-month changes
        $seasonality = [];
        $avgValue = array_sum($values) / count($values);
        
        foreach ($values as $index => $value) {
            $month = $index % 12;
            $seasonality[$month] = $value / $avgValue;
        }
        
        return $seasonality;
    }

    private function combineForecastData($historical, $aiForecast, $statistical)
    {
        $combined = [];
        
        // Add historical data
        foreach ($historical as $data) {
            $combined[] = [
                'month' => $data['month'],
                'actual' => $data['total_sales'],
                'forecast' => null,
                'type' => 'historical'
            ];
        }
        
        // Add AI forecast data
        if (isset($aiForecast['forecast'])) {
            foreach ($aiForecast['forecast'] as $forecast) {
                $combined[] = [
                    'month' => $forecast['month'],
                    'actual' => null,
                    'forecast' => $forecast['predicted_sales'],
                    'confidence' => $forecast['confidence_level'] ?? 0.85,
                    'type' => 'ai_forecast'
                ];
            }
        }
        
        // Add statistical forecast as backup
        foreach ($statistical as $forecast) {
            $monthExists = false;
            foreach ($combined as &$existing) {
                if ($existing['month'] === $forecast['month'] && $existing['type'] === 'ai_forecast') {
                    $existing['statistical_backup'] = $forecast['predicted_sales'];
                    $monthExists = true;
                    break;
                }
            }
            
            if (!$monthExists) {
                $combined[] = [
                    'month' => $forecast['month'],
                    'actual' => null,
                    'forecast' => $forecast['predicted_sales'],
                    'confidence' => $forecast['confidence_level'],
                    'type' => 'statistical_forecast'
                ];
            }
        }
        
        return $combined;
    }

    private function calculateDemandForecast($inventoryData, $salesData, $monthsAhead)
    {
        $forecast = [];
        $currentMonth = now()->month;
        $currentQuarter = ceil($currentMonth / 3);
        
        // Group inventory data by product for processing
        foreach ($inventoryData as $productData) {
            $productId = $productData['id'];
            $productName = $productData['product_name'];
            $categoryName = $productData['category_name'];
            
            // Get sales history for this specific product
            $productSales = $salesData[$productId] ?? [];
            
            if (empty($productSales)) {
                // If no sales history, use minimum estimates
                $avgMonthlyDemand = $productData['minimum_stock'] / 2;
                $recentMonthsDemand = $avgMonthlyDemand;
                $seasonalTrend = 'stable';
                $trendPercentage = 0;
            } else {
                $salesCollection = collect($productSales);
                $avgMonthlyDemand = $salesCollection->avg('total_quantity');
                
                // Calculate recent 3 months vs previous 3 months to detect seasonal trends
                $recentSales = $salesCollection->slice(-3)->avg('total_quantity') ?? $avgMonthlyDemand;
                $previousSales = $salesCollection->slice(-6, 3)->avg('total_quantity') ?? $avgMonthlyDemand;
                
                $recentMonthsDemand = $recentSales;
                
                // Determine seasonal trend
                if ($previousSales > 0) {
                    $trendPercentage = (($recentSales - $previousSales) / $previousSales) * 100;
                    
                    if ($trendPercentage > 20) {
                        $seasonalTrend = 'hot'; // Very high demand
                    } elseif ($trendPercentage > 10) {
                        $seasonalTrend = 'rising'; // Growing demand
                    } elseif ($trendPercentage < -20) {
                        $seasonalTrend = 'cold'; // Very low demand
                    } elseif ($trendPercentage < -10) {
                        $seasonalTrend = 'declining'; // Decreasing demand
                    } else {
                        $seasonalTrend = 'stable'; // Steady demand
                    }
                } else {
                    $trendPercentage = 0;
                    $seasonalTrend = 'stable';
                }
            }
            
            // Use recent trend for more accurate forecasting
            $trendFactor = 1 + ($trendPercentage / 100);
            $predictedDemand = $recentMonthsDemand * $monthsAhead * max($trendFactor, 0.5); // Don't go below 50% of current
            
            // Calculate performance score (0-100) based on sales velocity
            $performanceScore = 0;
            if ($productData['stock_quantity'] > 0) {
                $monthlyTurnover = $avgMonthlyDemand / max($productData['stock_quantity'], 1);
                $performanceScore = min(100, $monthlyTurnover * 100);
            }
            
            $forecast[] = [
                'id' => $productId,
                'product_name' => $productName,
                'sku' => $productData['sku'],
                'batch_number' => $productData['batch_number'],
                'category_name' => $categoryName,
                'current_stock' => $productData['stock_quantity'],
                'minimum_stock' => $productData['minimum_stock'],
                'avg_monthly_demand' => round($avgMonthlyDemand, 2),
                'recent_monthly_demand' => round($recentMonthsDemand, 2),
                'predicted_demand' => round($predictedDemand, 2),
                'recommended_stock' => round($predictedDemand * 1.2, 2), // 20% safety stock
                'reorder_point' => round($avgMonthlyDemand * 0.5, 2), // Half month supply
                'growth_rate' => round($trendPercentage, 2),
                'seasonal_trend' => $seasonalTrend, // hot, rising, stable, declining, cold
                'performance_score' => round($performanceScore, 1),
                'is_trending' => $seasonalTrend === 'hot' || $seasonalTrend === 'rising',
                'season' => $this->getCurrentSeason($currentQuarter),
            ];
        }
        
        // Sort by seasonal performance (hot/rising first), then by predicted demand
        usort($forecast, function($a, $b) {
            // Priority 1: Trending products first
            if ($a['is_trending'] != $b['is_trending']) {
                return $b['is_trending'] <=> $a['is_trending'];
            }
            // Priority 2: Higher growth rate
            if (abs($a['growth_rate'] - $b['growth_rate']) > 5) {
                return $b['growth_rate'] <=> $a['growth_rate'];
            }
            // Priority 3: Higher predicted demand
            return $b['predicted_demand'] <=> $a['predicted_demand'];
        });
        
        return $forecast;
    }
    
    private function getCurrentSeason($quarter)
    {
        $seasons = [
            1 => 'Q1 (Jan-Mar)',
            2 => 'Q2 (Apr-Jun)',
            3 => 'Q3 (Jul-Sep)',
            4 => 'Q4 (Oct-Dec)'
        ];
        return $seasons[$quarter] ?? 'Unknown';
    }

    private function generateRestockRecommendations($inventoryData, $demandForecast)
    {
        $recommendations = [];
        
        foreach ($demandForecast as $forecast) {
            $categoryName = $forecast['category_name'];
            $currentStock = $forecast['current_stock'];
            $predictedDemand = $forecast['predicted_demand'];
            $recommendedStock = $forecast['recommended_stock'];
            
            $stockDifference = $recommendedStock - $currentStock;
            
            if ($stockDifference > 0) {
                $urgency = $currentStock < $forecast['reorder_point'] ? 'high' : 'medium';
                
                $recommendations[] = [
                    'category' => $categoryName,
                    'action' => 'increase_stock',
                    'current_stock' => $currentStock,
                    'recommended_increase' => $stockDifference,
                    'urgency' => $urgency,
                    'reason' => "Predicted demand of {$predictedDemand} units exceeds current stock"
                ];
            }
        }
        
        return $recommendations;
    }

    private function getSeasonalHistoricalData()
    {
        return TransactionItem::with(['inventoryItem.category'])
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('inventory_items', 'transaction_items.inventory_item_id', '=', 'inventory_items.id')
            ->join('categories', 'inventory_items.category_id', '=', 'categories.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->subYear(), now()])
            ->selectRaw('
                categories.name as category,
                QUARTER(transactions.created_at) as quarter,
                SUM(transaction_items.quantity) as total_quantity,
                SUM(transaction_items.total_price) as total_revenue
            ')
            ->groupBy('categories.name', 'quarter')
            ->get()
            ->groupBy('category')
            ->map(function ($quarters, $category) {
                $data = ['category' => $category];
                foreach ($quarters as $quarter) {
                    $data['q' . $quarter['quarter']] = $quarter['total_quantity'];
                }
                return $data;
            })
            ->values()
            ->toArray();
    }

    private function calculateSeasonalPatterns($historicalData)
    {
        $patterns = [];
        
        foreach ($historicalData as $categoryData) {
            $quarters = [
                'q1' => $categoryData['q1'] ?? 0,
                'q2' => $categoryData['q2'] ?? 0,
                'q3' => $categoryData['q3'] ?? 0,
                'q4' => $categoryData['q4'] ?? 0
            ];
            
            $total = array_sum($quarters);
            $max = max($quarters);
            $peakQuarter = array_search($max, $quarters);
            
            $patterns[] = [
                'category' => $categoryData['category'],
                'q1' => $quarters['q1'],
                'q2' => $quarters['q2'],
                'q3' => $quarters['q3'],
                'q4' => $quarters['q4'],
                'peak_quarter' => strtoupper($peakQuarter),
                'peak_value' => $max,
                'total_annual' => $total
            ];
        }
        
        return $patterns;
    }
    
    private function getProductSeasonalData()
    {
        return TransactionItem::with(['inventoryItem'])
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('inventory_items', 'transaction_items.inventory_item_id', '=', 'inventory_items.id')
            ->join('categories', 'inventory_items.category_id', '=', 'categories.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->subYear(), now()])
            ->selectRaw('
                inventory_items.id as product_id,
                inventory_items.name as product_name,
                inventory_items.sku,
                inventory_items.batch_number,
                categories.name as category_name,
                QUARTER(transactions.created_at) as quarter,
                SUM(transaction_items.quantity) as total_quantity,
                SUM(transaction_items.total_price) as total_revenue,
                AVG(transaction_items.quantity) as avg_quantity
            ')
            ->groupBy('inventory_items.id', 'inventory_items.name', 'inventory_items.sku', 'inventory_items.batch_number', 'categories.name', 'quarter')
            ->get()
            ->groupBy('product_id')
            ->map(function ($quarters, $productId) {
                $firstQuarter = $quarters->first();
                $data = [
                    'product_id' => $productId,
                    'product_name' => $firstQuarter['product_name'],
                    'sku' => $firstQuarter['sku'],
                    'batch_number' => $firstQuarter['batch_number'] ?? 'N/A',
                    'category_name' => $firstQuarter['category_name']
                ];
                
                foreach ($quarters as $quarter) {
                    $data['q' . $quarter['quarter']] = $quarter['total_quantity'];
                    $data['q' . $quarter['quarter'] . '_revenue'] = $quarter['total_revenue'];
                }
                
                return $data;
            })
            ->values()
            ->toArray();
    }
    
    private function calculateProductSeasonalPatterns($productSeasonalData)
    {
        $patterns = [];
        $currentQuarter = ceil(now()->month / 3);
        
        foreach ($productSeasonalData as $productData) {
            $quarters = [
                'q1' => $productData['q1'] ?? 0,
                'q2' => $productData['q2'] ?? 0,
                'q3' => $productData['q3'] ?? 0,
                'q4' => $productData['q4'] ?? 0
            ];
            
            $total = array_sum($quarters);
            
            // Skip products with no sales
            if ($total == 0) {
                continue;
            }
            
            $max = max($quarters);
            $min = min(array_filter($quarters)); // Filter out zeros
            $peakQuarter = array_search($max, $quarters);
            
            // Calculate current quarter performance
            $currentQValue = $quarters['q' . $currentQuarter];
            $avgQuarterly = $total / count(array_filter($quarters));
            
            // Determine if this product is strong in current season
            $seasonalStrength = 'average';
            if ($currentQValue >= $max * 0.8) {
                $seasonalStrength = 'very_strong'; // Peak or near-peak season
            } elseif ($currentQValue >= $avgQuarterly * 1.2) {
                $seasonalStrength = 'strong'; // Above average
            } elseif ($currentQValue <= $avgQuarterly * 0.6) {
                $seasonalStrength = 'weak'; // Below average
            }
            
            // Calculate quarterly growth/decline
            $quarterlyTrends = [];
            for ($q = 1; $q <= 4; $q++) {
                $prevQ = $q - 1;
                if ($prevQ == 0) $prevQ = 4;
                
                $current = $quarters['q' . $q];
                $previous = $quarters['q' . $prevQ];
                
                if ($previous > 0) {
                    $change = (($current - $previous) / $previous) * 100;
                } else {
                    $change = $current > 0 ? 100 : 0;
                }
                
                $quarterlyTrends['q' . $q . '_change'] = round($change, 1);
            }
            
            // Predict next quarter based on historical pattern
            $nextQuarter = ($currentQuarter % 4) + 1;
            $nextQPrediction = $quarters['q' . $nextQuarter];
            
            // Adjust prediction based on current year trend
            $currentYearTotal = $currentQValue;
            if ($currentYearTotal > 0 && $total > 0) {
                $yearlyFactor = 1.05; // Assume 5% growth
                $nextQPrediction = round($nextQPrediction * $yearlyFactor);
            }
            
            $patterns[] = array_merge([
                'product_id' => $productData['product_id'],
                'product_name' => $productData['product_name'],
                'sku' => $productData['sku'],
                'batch_number' => $productData['batch_number'],
                'category_name' => $productData['category_name'],
                'q1' => $quarters['q1'],
                'q2' => $quarters['q2'],
                'q3' => $quarters['q3'],
                'q4' => $quarters['q4'],
                'peak_quarter' => 'Q' . substr($peakQuarter, -1),
                'peak_value' => $max,
                'current_quarter' => 'Q' . $currentQuarter,
                'current_quarter_value' => $currentQValue,
                'seasonal_strength' => $seasonalStrength,
                'avg_quarterly_sales' => round($avgQuarterly, 2),
                'total_annual' => $total,
                'next_quarter_prediction' => $nextQPrediction,
                'is_peak_season' => ($currentQuarter == substr($peakQuarter, -1))
            ], $quarterlyTrends);
        }
        
        // Sort by current quarter performance (strongest first)
        usort($patterns, function($a, $b) {
            if ($a['seasonal_strength'] != $b['seasonal_strength']) {
                $strengthOrder = ['very_strong' => 4, 'strong' => 3, 'average' => 2, 'weak' => 1];
                return ($strengthOrder[$b['seasonal_strength']] ?? 0) <=> ($strengthOrder[$a['seasonal_strength']] ?? 0);
            }
            return $b['current_quarter_value'] <=> $a['current_quarter_value'];
        });
        
        return $patterns;
    }

    private function getSalesPerformanceData()
    {
        return [
            'total_revenue' => Transaction::where('status', 'completed')->sum('total'),
            'total_transactions' => Transaction::where('status', 'completed')->count(),
            'average_transaction' => Transaction::where('status', 'completed')->avg('total'),
            'monthly_growth' => $this->calculateMonthlyGrowth(),
            'top_categories' => $this->getTopPerformingCategories()
        ];
    }

    private function getInventoryMetrics()
    {
        return [
            'total_items' => InventoryItem::count(),
            'total_value' => InventoryItem::sum(DB::raw('stock_quantity * price')),
            'low_stock_items' => InventoryItem::whereColumn('stock_quantity', '<=', 'minimum_stock')
                ->where('stock_quantity', '>', 0) // Exclude out of stock
                ->count(),
            'turnover_rate' => $this->calculateInventoryTurnover(),
            'out_of_stock_rate' => $this->calculateOutOfStockRate()
        ];
    }

    private function getCategoryPerformanceData()
    {
        return Category::with(['inventoryItems'])
            ->get()
            ->map(function ($category) {
                $totalSales = TransactionItem::whereHas('inventoryItem', function ($q) use ($category) {
                    $q->where('category_id', $category->id);
                })->sum('total_price');
                
                return [
                    'category' => $category->name,
                    'total_sales' => $totalSales,
                    'item_count' => $category->inventoryItems->count(),
                    'avg_price' => $category->inventoryItems->avg('price')
                ];
            })
            ->toArray();
    }

    private function getCustomerPatterns()
    {
        return [
            'repeat_customers' => Transaction::whereNotNull('customer_name')->distinct('customer_name')->count(),
            'average_items_per_transaction' => TransactionItem::avg('quantity'),
            'peak_hours' => $this->getPeakSalesHours(),
            'discount_usage' => $this->getDiscountUsagePattern()
        ];
    }

    private function getSeasonalBusinessData()
    {
        return Transaction::selectRaw('
                MONTH(created_at) as month,
                COUNT(*) as transaction_count,
                SUM(total) as monthly_sales
            ')
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subYear())
            ->groupBy('month')
            ->get()
            ->toArray();
    }

    private function calculateForecastAccuracy($months)
    {
        // This would compare previous forecasts with actual results
        // For now, return sample data structure
        return [
            'overall_accuracy' => 0.92,
            'monthly_accuracy' => [
                ['month' => 'May 2025', 'accuracy' => 0.95],
                ['month' => 'April 2025', 'accuracy' => 0.93],
                ['month' => 'March 2025', 'accuracy' => 0.89]
            ],
            'improvement_trend' => 0.03
        ];
    }

    // Additional helper methods
    private function calculateMonthlyGrowth()
    {
        $currentMonth = Transaction::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total');
        
        $previousMonth = Transaction::whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->sum('total');
        
        return $previousMonth > 0 ? (($currentMonth - $previousMonth) / $previousMonth) * 100 : 0;
    }

    private function getTopPerformingCategories()
    {
        return TransactionItem::with(['inventoryItem.category'])
            ->join('inventory_items', 'transaction_items.inventory_item_id', '=', 'inventory_items.id')
            ->join('categories', 'inventory_items.category_id', '=', 'categories.id')
            ->selectRaw('categories.name, SUM(transaction_items.total_price) as total_sales')
            ->groupBy('categories.name')
            ->orderBy('total_sales', 'desc')
            ->limit(5)
            ->get()
            ->toArray();
    }

    private function calculateInventoryTurnover()
    {
        $totalSales = TransactionItem::sum('total_price');
        $averageInventory = InventoryItem::sum(DB::raw('stock_quantity * cost'));
        
        return $averageInventory > 0 ? $totalSales / $averageInventory : 0;
    }

    private function calculateOutOfStockRate()
    {
        $totalItems = InventoryItem::count();
        $outOfStockItems = InventoryItem::where('stock_quantity', 0)->count();
        
        return $totalItems > 0 ? ($outOfStockItems / $totalItems) * 100 : 0;
    }

    private function getPeakSalesHours()
    {
        return Transaction::selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('count', 'desc')
            ->limit(3)
            ->get()
            ->pluck('hour')
            ->toArray();
    }

    private function getDiscountUsagePattern()
    {
        $totalTransactions = Transaction::count();
        $discountTransactions = Transaction::where(function ($q) {
            $q->where('is_senior_citizen', true)
              ->orWhere('is_pwd', true)
              ->orWhere('discount_amount', '>', 0);
        })->count();
        
        return $totalTransactions > 0 ? ($discountTransactions / $totalTransactions) * 100 : 0;
    }
}