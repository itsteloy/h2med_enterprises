<?php
// app/Http/Controllers/CategoryController.php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Category::withCount('inventoryItems');
            
            // Apply search filter
            if ($search = $request->input('search')) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            
            // Apply status filter
            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }
            
            // Apply sorting
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);
            
            // Get paginated results
            $perPage = $request->input('per_page', 15);
            $categories = $query->paginate($perPage);
            
            return response()->json([
                'success' => true,
                'data' => $categories->items(),
                'pagination' => [
                    'current_page' => $categories->currentPage(),
                    'last_page' => $categories->lastPage(),
                    'per_page' => $categories->perPage(),
                    'total' => $categories->total()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching categories: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve categories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAllActive(Request $request)
    {
        try {
            $categories = Category::where('status', 'active')
                ->orderBy('name', 'asc')
                ->get(['id', 'name', 'description']);
            
            return response()->json([
                'success' => true,
                'data' => $categories,
                'message' => 'Active categories retrieved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching active categories: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve active categories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:categories',
                'description' => 'nullable|string|max:500',
                'status' => 'required|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();
            $category = Category::create($validated);
            
            return response()->json([
                'success' => true,
                'data' => $category,
                'message' => 'Category created successfully'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating category: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create category',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $category = Category::withCount('inventoryItems')->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $category
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching category: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $category = Category::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
                'description' => 'nullable|string|max:500',
                'status' => 'required|in:active,inactive',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();
            $category->update($validated);
            
            return response()->json([
                'success' => true,
                'data' => $category,
                'message' => 'Category updated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating category: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update category',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $category = Category::findOrFail($id);
            $forceDelete = $request->input('force', false);
            
            // Enhanced check with detailed feedback
            $itemsCount = $category->inventoryItems()->count();
            if ($itemsCount > 0 && !$forceDelete) {
                $recentItems = $category->inventoryItems()
                    ->select('id', 'sku', 'name', 'stock_quantity', 'created_at')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get();
                    
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete category '{$category->name}' because it contains {$itemsCount} inventory item(s).",
                    'data' => [
                        'items_count' => $itemsCount,
                        'recent_items' => $recentItems,
                        'suggestion' => 'Please reassign or remove all items from this category first, or use force delete.'
                    ]
                ], 400);
            }
            
            // If force delete or no items, proceed with deletion
            if ($itemsCount > 0 && $forceDelete) {
                // Set category_id to null for all items (orphan them)
                $category->inventoryItems()->update(['category_id' => null]);
                Log::warning("Force deleted category '{$category->name}' with {$itemsCount} items. Items were orphaned.");
            }
            
            $categoryName = $category->name;
            $category->delete();
            
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => "Category '{$categoryName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting category: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete category',
                'error' => $e->getMessage()
            ], 500);
        }
    }
   
}