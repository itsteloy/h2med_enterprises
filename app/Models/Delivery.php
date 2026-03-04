<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $table = 'deliveries';

    protected $fillable = [
        'reference_no',
        'customer',
        'phone',
        'delivery_date',
        'expiration_date', // ✅ Added
        'products',        // ✅ Added
        'status',
        'balance',
        'payment'
    ];

    protected $casts = [
        'balance' => 'float',
        'payment' => 'float',
        'products' => 'array', // ✅ Added casting for JSON
    ];
}