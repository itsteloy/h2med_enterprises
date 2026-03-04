<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Delivery;

class DeliveryController extends Controller
{
    public function index()
    {
        $deliveries = Delivery::orderBy('delivery_date', 'desc')->get();
        return response()->json($deliveries);
    }

    private function calculateStatus($balance, $payment)
    {
        $balance = (float)$balance;
        $payment = (float)$payment;

        if ($payment <= 0) {
            return 'pending';
        }
        if ($payment >= $balance) {
            return 'paid';
        }
        if ($balance > $payment) {
            return 'terms';
        }
        return 'pending';
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'reference_no' => 'required|string|max:50',
            'customer' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'delivery_date' => 'required|date',
            'expiration_date' => 'nullable|date',
            'products' => 'nullable|array',
            'balance' => 'required|numeric',
            'payment' => 'nullable|numeric',
        ]);

        // Auto-calculate status logic
        $data['status'] = $this->calculateStatus($data['balance'], $data['payment'] ?? 0);

        $delivery = Delivery::create($data);
        return response()->json($delivery, 201);
    }

    public function update(Request $request, $id)
    {
        $delivery = Delivery::findOrFail($id);

        $data = $request->validate([
            'reference_no' => 'required|string|max:50',
            'customer' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'delivery_date' => 'required|date',
            'expiration_date' => 'nullable|date',
            'products' => 'nullable|array',
            'balance' => 'required|numeric',
            'payment' => 'nullable|numeric',
        ]);

        // Auto-calculate status logic
        $data['status'] = $this->calculateStatus($data['balance'], $data['payment'] ?? 0);

        $delivery->update($data);
        return response()->json($delivery);
    }

    public function show($id)
    {
        $delivery = Delivery::findOrFail($id);
        return response()->json($delivery);
    }

    public function destroy($id)
    {
        $delivery = Delivery::findOrFail($id);
        $delivery->delete();
        return response()->json(['deleted' => true]);
    }
}