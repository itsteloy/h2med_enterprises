<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_number',
        'customer_name',
        'subtotal',
        'discount_rate',
        'discount_amount',
        'vat',
        'total',
        'payment_method',
        'cash_amount',
        'change_amount',
        'status',
        'is_senior_citizen',
        'senior_id',        // DEFENSE MINUTES FIX: Added
        'is_pwd',
        'pwd_id',           // DEFENSE MINUTES FIX: Added
        'user_id'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_rate' => 'decimal:4',
        'discount_amount' => 'decimal:2',
        'vat' => 'decimal:2',
        'total' => 'decimal:2',
        'cash_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'is_senior_citizen' => 'boolean',
        'is_pwd' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user (cashier) who processed this transaction
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all items in this transaction
     */
    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    /**
     * Scope for completed transactions
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for today's transactions
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope for this week's transactions
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * Scope for this month's transactions
     */
    public function scopeThisMonth($query)
    {
        return $query->whereBetween('created_at', [
            now()->startOfMonth(),
            now()->endOfMonth()
        ]);
    }

    /**
     * Scope for transactions within date range
     */
    public function scopeWithinDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope for transactions by payment method
     */
    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    /**
     * Scope for transactions with discounts
     */
    public function scopeWithDiscounts($query)
    {
        return $query->where(function($q) {
            $q->where('is_senior_citizen', true)
              ->orWhere('is_pwd', true)
              ->orWhere('discount_amount', '>', 0);
        });
    }

    /**
     * Scope for senior citizen transactions
     */
    public function scopeSeniorCitizen($query)
    {
        return $query->where('is_senior_citizen', true);
    }

    /**
     * Scope for PWD transactions
     */
    public function scopePwd($query)
    {
        return $query->where('is_pwd', true);
    }

    /**
     * Scope for transactions by cashier (user_id)
     * DEFENSE MINUTES FIX: Added for per-cashier tracking
     */
    public function scopeByCashier($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get formatted receipt number
     */
    public function getFormattedReceiptNumberAttribute()
    {
        return strtoupper($this->receipt_number);
    }

    /**
     * Get total items count in transaction
     */
    public function getTotalItemsAttribute()
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Check if transaction has discount
     */
    public function hasDiscount(): bool
    {
        return $this->is_senior_citizen || $this->is_pwd || $this->discount_amount > 0;
    }

    /**
     * Get discount type label
     */
    public function getDiscountTypeAttribute(): ?string
    {
        if ($this->is_senior_citizen) {
            return 'Senior Citizen';
        }
        if ($this->is_pwd) {
            return 'PWD';
        }
        if ($this->discount_rate > 0) {
            return 'General Discount';
        }
        return null;
    }

    /**
     * Get discount percentage
     */
    public function getDiscountPercentageAttribute(): float
    {
        if ($this->is_senior_citizen || $this->is_pwd) {
            return 20.0; // 20% for senior/PWD
        }
        return ($this->discount_rate ?? 0) * 100;
    }

    /**
     * Calculate original subtotal (before discount)
     */
    public function getOriginalSubtotalAttribute(): float
    {
        if ($this->discount_amount > 0) {
            return $this->subtotal + $this->discount_amount;
        }
        return $this->subtotal;
    }

    /**
     * Generate unique receipt number
     */
    public static function generateReceiptNumber()
    {
        do {
            $receiptNumber = 'POS-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (self::where('receipt_number', $receiptNumber)->exists());

        return $receiptNumber;
    }
}