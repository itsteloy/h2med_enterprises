<?php 
// Create: app/Http/Middleware/RoleMiddleware.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!Auth::check()) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
            return redirect()->route('login');
        }

        $userRole = Auth::user()->role;
        
        if (!in_array($userRole, $roles)) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            // Redirect based on user role
            if ($userRole === 'admin') {
                return redirect()->route('admin.dashboard')->with('error', 'Access denied.');
            } else {
                return redirect()->route('staff.dashboard')->with('error', 'Access denied.');
            }
        }

        return $next($request);
    }
}