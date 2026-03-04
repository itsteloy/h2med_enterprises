<?php

// app/Models/StockMovement.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id',
        'user_id',
        'type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reason',
        'notes',
        'reference_number',
    ];

    protected $appends = ['batch_number'];

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get batch number from related inventory item
     */
    public function getBatchNumberAttribute()
    {
        return $this->inventoryItem ? $this->inventoryItem->batch_number : null;
    }

    public function scopeStockIn($query)
    {
        return $query->where('type', 'in');
    }

    public function scopeStockOut($query)
    {
        return $query->where('type', 'out');
    }

    public function scopeAdjustments($query)
    {
        return $query->where('type', 'adjustment');
    }
}