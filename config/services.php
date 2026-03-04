<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
  /*
    |--------------------------------------------------------------------------
    | Azure OpenAI Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Azure OpenAI services used for pharmacy forecasting
    | and business intelligence features.
    |
    */
    'azure_openai' => [
        'api_key' => env('AZURE_OPENAI_API_KEY'),
        'endpoint' => env('AZURE_OPENAI_ENDPOINT'),
        'deployment_name' => env('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o-2'),
        'api_version' => env('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
        'max_tokens' => env('AZURE_OPENAI_MAX_TOKENS', 1000),
        'temperature' => env('AZURE_OPENAI_TEMPERATURE', 0.7),
        
        // Caching settings for forecast requests
            'cache_duration' => [
            'sales_forecast' => 0.5,    // 30 minutes instead of 6 hours
            'inventory_forecast' => 0.25, // 15 minutes instead of 4 hours  
            'seasonal_trends' => 2,     // 2 hours instead of 12 hours
            'business_insights' => 1,   // 1 hour instead of 8 hours
        ],
        // Rate limiting
        'rate_limit' => [
            'requests_per_minute' => 60,
            'requests_per_hour' => 1000,
        ],
        
        // Retry settings
        'retry' => [
            'max_attempts' => 3,
            'delay' => 2, // seconds
        ],
    ],
];
