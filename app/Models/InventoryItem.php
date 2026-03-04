<?php

// app/Models/InventoryItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sku',
        'name',
        'description',
        'category_id',
        'supplier_id',
        'price',
        'cost',
        'stock_quantity',
        'minimum_stock',
        'maximum_stock',
        'unit',
        'status',
        'expiry_date',
        'batch_number',
        'barcode',
        'images',
    ];

    protected $casts = [
        'images' => 'array',
        'expiry_date' => 'date',
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('stock_quantity', '<=', 'minimum_stock')
                     ->where('stock_quantity', '>', 0); // Exclude out of stock items
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('stock_quantity', 0);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity > 0 && $this->stock_quantity <= $this->minimum_stock;
    }

    public function isOutOfStock(): bool
    {
        return $this->stock_quantity === 0;
    }

    public function isInStock(): bool
    {
        return $this->stock_quantity > 0;
    }

    public function getStockStatus(): string
    {
        if ($this->isOutOfStock()) {
            return 'Out of Stock';
        } elseif ($this->isLowStock()) {
            return 'Low Stock';
        } else {
            return 'In Stock';
        }
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        return $this->expiry_date->diffInDays(now()) <= $days && $this->expiry_date->isFuture();
    }

    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        return $this->expiry_date->isPast();
    }

    public function hasBarcode(): bool
    {
        return !empty($this->barcode);
    }

    public function needsBarcode(): bool
    {
        return empty($this->barcode);
    }

    /**
     * Get the barcode display format
     */
    public function getBarcodeDisplayAttribute(): string
    {
        return $this->barcode ?: 'No Barcode';
    }

    /**
     * Check if item is near expiry
     */
    public function isNearExpiry($days = 30): bool
    {
        if (!$this->expiry_date) {
            return false;
        }

        $expiryDate = Carbon::parse($this->expiry_date);
        $checkDate = now()->addDays($days);
        
        return $expiryDate->lte($checkDate) && $expiryDate->gt(now());
    }

    /**
     * Get days until expiry
     */
    public function getDaysUntilExpiry(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }

        $expiryDate = Carbon::parse($this->expiry_date);
        
        if ($expiryDate->isPast()) {
            return 0; // Already expired
        }

        return $expiryDate->diffInDays(now());
    }

    /**
     * Get stock percentage based on minimum and maximum
     */
    public function getStockPercentage(): float
    {
        if ($this->maximum_stock <= 0) {
            return 0;
        }

        return ($this->stock_quantity / $this->maximum_stock) * 100;
    }

    /**
     * Get inventory value for this item
     */
    public function getInventoryValue(): float
    {
        return $this->stock_quantity * $this->price;
    }

    /**
     * Get cost value for this item
     */
    public function getCostValue(): float
    {
        return $this->stock_quantity * ($this->cost ?: 0);
    }

    /**
     * Get profit margin
     */
    public function getProfitMargin(): float
    {
        if (!$this->cost || $this->cost <= 0 || $this->price <= 0) {
            return 0;
        }

        return (($this->price - $this->cost) / $this->price) * 100;
    }
}