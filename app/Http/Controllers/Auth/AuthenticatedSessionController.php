<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('/', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        
        // Get authenticated user
        $user = Auth::user();
        
        // Check if user is inactive
        if ($user->status === 'inactive') {
            Auth::logout();
            
            return back()->withErrors([
                'email' => 'Your account is currently inactive. Please use another account.',
            ]);
        }

        $request->session()->regenerate();

        // Redirect based on user role
        if ($user->role === 'admin' || $user->role === 'staff') {
            return redirect()->intended(route('admin.dashboard'));
        } elseif ($user->role === 'customer') {
            return redirect()->intended(route('customer.dashboard'));
        } elseif ($user->role === 'collector') {
            return redirect()->intended(route('collector.dashboard'));
        }

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
