<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransactionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'inventory_item_id',
        'quantity',
        'unit_price',
        'total_price',
        'discount_rate',
        'discount_amount',
        'is_senior_citizen',
        'is_pwd',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'discount_rate' => 'decimal:4',
        'discount_amount' => 'decimal:2',
        'is_senior_citizen' => 'boolean',
        'is_pwd' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the transaction this item belongs to
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    /**
     * Get the inventory item
     */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    /**
     * Calculate total price automatically on save
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transactionItem) {
            // Calculate base total
            $baseTotal = $transactionItem->quantity * $transactionItem->unit_price;
            
            // Apply discount if any
            $discountAmount = $transactionItem->discount_amount ?? 0;
            $transactionItem->total_price = $baseTotal - $discountAmount;
        });

        static::updating(function ($transactionItem) {
            // Calculate base total
            $baseTotal = $transactionItem->quantity * $transactionItem->unit_price;
            
            // Apply discount if any
            $discountAmount = $transactionItem->discount_amount ?? 0;
            $transactionItem->total_price = $baseTotal - $discountAmount;
        });
    }

    /**
     * Get the item name from inventory
     */
    public function getItemNameAttribute()
    {
        return $this->inventoryItem?->name ?? 'Unknown Item';
    }

    /**
     * Get the item SKU from inventory
     */
    public function getItemSkuAttribute()
    {
        return $this->inventoryItem?->sku ?? 'N/A';
    }

    /**
     * Get original total before discount
     */
    public function getOriginalTotalAttribute()
    {
        return $this->quantity * $this->unit_price;
    }

    /**
     * Check if item has discount
     */
    public function hasDiscount(): bool
    {
        return $this->discount_amount > 0 || $this->is_senior_citizen || $this->is_pwd;
    }

    /**
     * Get discount type
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
     * Scope for items in a specific transaction
     */
    public function scopeForTransaction($query, $transactionId)
    {
        return $query->where('transaction_id', $transactionId);
    }

    /**
     * Scope for items of a specific inventory item
     */
    public function scopeForInventoryItem($query, $inventoryItemId)
    {
        return $query->where('inventory_item_id', $inventoryItemId);
    }

    /**
     * Scope for items with discounts
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
     * Scope for senior citizen items
     */
    public function scopeSeniorCitizen($query)
    {
        return $query->where('is_senior_citizen', true);
    }

    /**
     * Scope for PWD items
     */
    public function scopePwd($query)
    {
        return $query->where('is_pwd', true);
    }
}