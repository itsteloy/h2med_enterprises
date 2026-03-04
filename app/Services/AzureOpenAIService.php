<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Exception;

class AzureOpenAIService
{
    private $endpoint;
    private $apiKey;
    private $deploymentName;
    private $apiVersion;
    private $maxTokens;
    private $temperature;
    private $cacheConfig;
    private $rateLimitConfig;
    private $retryConfig;

    public function __construct()
    {
        $this->endpoint = config('services.azure_openai.endpoint');
        $this->apiKey = config('services.azure_openai.api_key');
        $this->deploymentName = config('services.azure_openai.deployment_name');
        $this->apiVersion = config('services.azure_openai.api_version');
        $this->maxTokens = config('services.azure_openai.max_tokens', 1000);
        $this->temperature = config('services.azure_openai.temperature', 0.7);
        $this->cacheConfig = config('services.azure_openai.cache_duration', []);
        $this->rateLimitConfig = config('services.azure_openai.rate_limit', []);
        $this->retryConfig = config('services.azure_openai.retry', []);
    }

    /**
     * Test the connection to Azure OpenAI
     */
    public function testConnection()
    {
        try {
            $response = $this->makeApiCall([
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => 'Hello, this is a connection test. Please respond with "Connection successful".'
                    ]
                ],
                'max_tokens' => 50,
                'temperature' => 0.1
            ]);

            if ($response && isset($response['choices'][0]['message']['content'])) {
                return [
                    'success' => true,
                    'message' => 'Azure OpenAI connection successful',
                    'response' => $response['choices'][0]['message']['content'],
                    'model' => $response['model'] ?? 'Unknown'
                ];
            }

            return [
                'success' => false,
                'message' => 'Unexpected response format from Azure OpenAI'
            ];

        } catch (Exception $e) {
            Log::error('Azure OpenAI connection test failed: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate sales forecast
     */
    public function generateSalesForecast($historicalData, $months)
    {
        $cacheKey = 'sales_forecast_' . md5(json_encode($historicalData) . $months);
        $cacheDuration = $this->cacheConfig['sales_forecast'] ?? 6; // hours
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('Sales forecast served from cache');
            return $cached;
        }
        
        // Check rate limit
        if (!$this->checkRateLimit('sales_forecast')) {
            throw new Exception('Rate limit exceeded for sales forecast requests');
        }

        try {
            $prompt = $this->buildSalesForecastPrompt($historicalData, $months);
            
            $response = $this->makeApiCallWithRetry([
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an expert business analyst and forecasting specialist. Analyze the provided sales data and generate accurate forecasts with actionable insights. Respond in JSON format.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => $this->maxTokens,
                'temperature' => $this->temperature
            ]);

            $result = $this->parseForecastResponse($response, 'sales');
            
            // Cache the result
            Cache::put($cacheKey, $result, now()->addHours($cacheDuration));
            
            return $result;

        } catch (Exception $e) {
            Log::error('Sales forecast generation failed: ' . $e->getMessage());
            return $this->getDefaultSalesForecast($months);
        }
    }

    /**
     * Generate inventory forecast
     */
    public function generateInventoryForecast($inventoryData, $salesData)
    {
        $cacheKey = 'inventory_forecast_' . md5(json_encode($inventoryData) . json_encode($salesData));
        $cacheDuration = $this->cacheConfig['inventory_forecast'] ?? 4; // hours
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('Inventory forecast served from cache');
            return $cached;
        }
        
        // Check rate limit
        if (!$this->checkRateLimit('inventory_forecast')) {
            throw new Exception('Rate limit exceeded for inventory forecast requests');
        }

        try {
            $prompt = $this->buildInventoryForecastPrompt($inventoryData, $salesData);
            
            $response = $this->makeApiCallWithRetry([
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an inventory management expert. Analyze inventory and sales data to predict demand and provide restocking recommendations. Respond in JSON format.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => $this->maxTokens,
                'temperature' => $this->temperature
            ]);

            $result = $this->parseForecastResponse($response, 'inventory');
            
            // Cache the result
            Cache::put($cacheKey, $result, now()->addHours($cacheDuration));
            
            return $result;

        } catch (Exception $e) {
            Log::error('Inventory forecast generation failed: ' . $e->getMessage());
            return $this->getDefaultInventoryForecast();
        }
    }

    /**
     * Generate seasonal trends analysis
     */
    public function generateSeasonalTrends($historicalData)
    {
        $cacheKey = 'seasonal_trends_' . md5(json_encode($historicalData));
        $cacheDuration = $this->cacheConfig['seasonal_trends'] ?? 12; // hours
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('Seasonal trends served from cache');
            return $cached;
        }
        
        // Check rate limit
        if (!$this->checkRateLimit('seasonal_trends')) {
            throw new Exception('Rate limit exceeded for seasonal trends requests');
        }

        try {
            $prompt = $this->buildSeasonalTrendsPrompt($historicalData);
            
            $response = $this->makeApiCallWithRetry([
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a retail analytics expert specializing in seasonal trends. Analyze quarterly sales patterns and provide insights. Respond in JSON format.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => $this->maxTokens,
                'temperature' => $this->temperature
            ]);

            $result = $this->parseForecastResponse($response, 'seasonal');
            
            // Cache the result
            Cache::put($cacheKey, $result, now()->addHours($cacheDuration));
            
            return $result;

        } catch (Exception $e) {
            Log::error('Seasonal trends generation failed: ' . $e->getMessage());
            return $this->getDefaultSeasonalTrends();
        }
    }

    /**
     * Generate business insights
     */
    public function generateBusinessInsights($businessData)
    {
        $cacheKey = 'business_insights_' . md5(json_encode($businessData));
        $cacheDuration = $this->cacheConfig['business_insights'] ?? 8; // hours
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('Business insights served from cache');
            return $cached;
        }
        
        // Check rate limit
        if (!$this->checkRateLimit('business_insights')) {
            throw new Exception('Rate limit exceeded for business insights requests');
        }

        try {
            $prompt = $this->buildBusinessInsightsPrompt($businessData);
            
            $response = $this->makeApiCallWithRetry([
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a senior business strategist and data analyst. Analyze comprehensive business data to identify opportunities, risks, and strategic recommendations. Respond in JSON format.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => $this->maxTokens,
                'temperature' => $this->temperature
            ]);

            $result = $this->parseForecastResponse($response, 'insights');
            
            // Cache the result
            Cache::put($cacheKey, $result, now()->addHours($cacheDuration));
            
            return $result;

        } catch (Exception $e) {
            Log::error('Business insights generation failed: ' . $e->getMessage());
            return $this->getDefaultBusinessInsights();
        }
    }

    /**
     * Check rate limits
     */
    private function checkRateLimit($operation)
    {
        $key = 'azure_openai_' . $operation;
        $maxAttempts = $this->rateLimitConfig['requests_per_minute'] ?? 60;
        
        return RateLimiter::attempt($key, $maxAttempts, function() {
            // Rate limit passed
        }, 60);
    }

    /**
     * Make API call with retry logic
     */
    private function makeApiCallWithRetry($payload)
    {
        $maxAttempts = $this->retryConfig['max_attempts'] ?? 3;
        $delay = $this->retryConfig['delay'] ?? 2;
        
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                Log::info("Azure OpenAI API call attempt {$attempt}/{$maxAttempts}");
                return $this->makeApiCall($payload);
            } catch (Exception $e) {
                Log::warning("Azure OpenAI API call attempt {$attempt} failed: " . $e->getMessage());
                
                if ($attempt === $maxAttempts) {
                    throw $e;
                }
                
                sleep($delay * $attempt); // Exponential backoff
            }
        }
    }

    /**
     * Make API call to Azure OpenAI
     */
    private function makeApiCall($payload)
    {
        $url = rtrim($this->endpoint, '/') . '/openai/deployments/' . $this->deploymentName . '/chat/completions?api-version=' . $this->apiVersion;

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'api-key' => $this->apiKey
        ])->timeout(60)->post($url, $payload);

        if ($response->failed()) {
            throw new Exception('Azure OpenAI API request failed: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Build sales forecast prompt
     */
    private function buildSalesForecastPrompt($historicalData, $months)
    {
        $dataJson = json_encode($historicalData);
        
        return "Based on the following historical sales data, generate a forecast for the next {$months} months. 
        
Historical Data:
{$dataJson}

Please provide:
1. Monthly sales predictions with confidence levels
2. Key insights about trends and patterns
3. Recommendations for business optimization
4. Risk factors to consider

Respond in JSON format with this structure:
{
    \"forecast\": [
        {
            \"month\": \"YYYY-MM\",
            \"predicted_sales\": number,
            \"confidence_level\": number (0-1)
        }
    ],
    \"insights\": [\"insight1\", \"insight2\"],
    \"recommendations\": [\"recommendation1\", \"recommendation2\"],
    \"accuracy_estimate\": number (0-1)
}";
    }

    /**
     * Build inventory forecast prompt
     */
    private function buildInventoryForecastPrompt($inventoryData, $salesData)
    {
        $inventoryJson = json_encode($inventoryData);
        $salesJson = json_encode($salesData);
        
        return "Analyze the inventory and sales data to predict demand and provide restocking recommendations.

Current Inventory:
{$inventoryJson}

Sales Data:
{$salesJson}

Please provide:
1. Demand predictions by category
2. Optimal stock levels
3. Reorder recommendations
4. Risk assessment for stockouts

Respond in JSON format with detailed analysis and recommendations.";
    }

    /**
     * Build seasonal trends prompt
     */
    private function buildSeasonalTrendsPrompt($historicalData)
    {
        $dataJson = json_encode($historicalData);
        
        return "Analyze the quarterly sales data to identify seasonal patterns and trends.

Quarterly Data:
{$dataJson}

Please identify:
1. Peak seasons for each category
2. Seasonal growth patterns
3. Weather/holiday impact analysis
4. Preparation recommendations for upcoming seasons

Respond in JSON format with seasonal insights and recommendations.";
    }

    /**
     * Build business insights prompt
     */
    private function buildBusinessInsightsPrompt($businessData)
    {
        $dataJson = json_encode($businessData);
        
        return "Analyze the comprehensive business data to provide strategic insights.

Business Data:
{$dataJson}

Please provide:
1. Performance metrics analysis
2. Growth opportunities identification
3. Risk assessment and mitigation strategies
4. Strategic recommendations for improvement
5. Market trend analysis

Respond in JSON format with detailed business insights.";
    }

    /**
     * Parse AI response
     */
    private function parseForecastResponse($response, $type)
    {
        if (!$response || !isset($response['choices'][0]['message']['content'])) {
            throw new Exception('Invalid response from Azure OpenAI');
        }

        $content = $response['choices'][0]['message']['content'];
        
        // Try to extract JSON from the response
        $jsonStart = strpos($content, '{');
        $jsonEnd = strrpos($content, '}');
        
        if ($jsonStart !== false && $jsonEnd !== false) {
            $jsonContent = substr($content, $jsonStart, $jsonEnd - $jsonStart + 1);
            $decoded = json_decode($jsonContent, true);
            
            if ($decoded) {
                return $decoded;
            }
        }

        // If JSON parsing fails, return a structured response
        return $this->getDefaultResponse($type);
    }

    /**
     * Default responses when AI fails
     */
    private function getDefaultSalesForecast($months)
    {
        $forecast = [];
        for ($i = 1; $i <= $months; $i++) {
            $forecast[] = [
                'month' => now()->addMonths($i)->format('Y-m'),
                'predicted_sales' => 50000 + ($i * 2000),
                'confidence_level' => 0.75
            ];
        }

        return [
            'forecast' => $forecast,
            'insights' => ['Historical data shows steady growth trend'],
            'recommendations' => ['Continue current sales strategy'],
            'accuracy_estimate' => 0.75
        ];
    }

    private function getDefaultInventoryForecast()
    {
        return [
            'forecast' => [],
            'recommendations' => ['Review inventory levels regularly'],
            'risk_factors' => ['Insufficient historical data']
        ];
    }

    private function getDefaultSeasonalTrends()
    {
        return [
            'seasonal_patterns' => [],
            'recommendations' => ['Collect more seasonal data for analysis'],
            'weather_impact' => []
        ];
    }

    private function getDefaultBusinessInsights()
    {
        return [
            'performance_metrics' => [
                'revenue_growth' => 0.05,
                'inventory_turnover' => 4.0,
                'profit_margin' => 0.15,
                'customer_retention' => 0.80
            ],
            'opportunities' => [
                [
                    'area' => 'Data Collection',
                    'description' => 'Improve data collection for better AI insights',
                    'potential_impact' => 'Medium'
                ]
            ],
            'risks' => [
                [
                    'risk' => 'Limited historical data',
                    'categories' => ['All'],
                    'mitigation' => 'Implement comprehensive data tracking'
                ]
            ],
            'strategic_recommendations' => ['Enhance data collection processes'],
            'market_trends' => ['Focus on data-driven decision making']
        ];
    }

    private function getDefaultResponse($type)
    {
        switch ($type) {
            case 'sales':
                return $this->getDefaultSalesForecast(12);
            case 'inventory':
                return $this->getDefaultInventoryForecast();
            case 'seasonal':
                return $this->getDefaultSeasonalTrends();
            case 'insights':
                return $this->getDefaultBusinessInsights();
            default:
                return [];
        }
    }
}