// 2026_02_23_105749_create_deliveries_table.php

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no', 50);
            $table->string('customer', 255);
            $table->string('phone', 20)->nullable();
            $table->date('delivery_date');
            $table->date('expiration_date')->nullable(); // ✅ Added Expiration Date
            $table->json('products')->nullable(); // ✅ Added Products storage
            $table->enum('status', ['pending', 'paid', 'terms'])->default('terms')->nullable();
            $table->decimal('balance', 12, 2)->nullable()->default(0);
            $table->decimal('payment', 12, 2)->nullable()->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};