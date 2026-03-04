import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    // Animation effect on component mount
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // Check if error message indicates inactive account
    const isInactiveAccount = errors.email?.toLowerCase().includes('inactive');

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Modern animated background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-red-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
            </div>
            
            <Head title="Log in - POS Inventory" />

            <div className={`w-full max-w-6xl z-10 transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden flex flex-col lg:flex-row border border-white/20 transition-all duration-500 hover:shadow-3xl">
                    {/* Left Column - Login Form */}
                    <div className="w-full lg:w-1/2 p-8 lg:p-12 bg-gradient-to-br from-white via-gray-50/50 to-white/80">
                        <div className={`mb-8 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                                    <p className="text-gray-600 mt-1">Sign in to your POS Inventory account</p>
                                </div>
                            </div>
                        </div>

                        {/* Inactive Account Alert */}
                        {isInactiveAccount && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse">
                                <div className="flex items-start">
                                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-semibold text-red-800">Account Inactive</h3>
                                        <p className="text-sm text-red-700 mt-1">{errors.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={submit}>
                            <div className={`space-y-5 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <div>
                                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">Email Address</Label>
                                    <div className="relative group">
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="Enter your email"
                                            className={`w-full h-12 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 transition-all duration-300 group-hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm ${isInactiveAccount ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                                        />
                                    </div>
                                    {!isInactiveAccount && <InputError message={errors.email} />}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                                        {canResetPassword && (
                                            <TextLink 
                                                href={route('password.request')} 
                                                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors duration-200" 
                                                tabIndex={5}
                                            >
                                                Forgot password?
                                            </TextLink>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Enter your password"
                                            className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 transition-all duration-300 group-hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-sm"
                                        />
                                        <button 
                                            type="button"
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>

                                <div className={`flex items-center space-x-3 transition-all duration-700 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onClick={() => setData('remember', !data.remember)}
                                        tabIndex={3}
                                        className="h-4 w-4 text-red-600 focus:ring-2 focus:ring-red-500/20 border-gray-300 rounded"
                                    />
                                    <Label htmlFor="remember" className="text-sm text-gray-600 font-medium">Remember me</Label>
                                </div>

                                <Button 
                                    type="submit" 
                                    className={`w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center ${isLoaded ? 'opacity-100 translate-y-0 delay-900' : 'opacity-0 translate-y-4'}`}
                                    tabIndex={4} 
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </div>
                        </form>

                        {status && (
                            <div className="mt-6 text-center text-sm font-medium text-green-600 animate-pulse bg-green-50 rounded-lg py-3 px-4">
                                {status}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Brand Section */}
                    <div className="w-full lg:w-1/2 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 p-8 lg:p-12 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200/40 to-pink-200/40 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-200/40 to-cyan-200/40 rounded-full blur-2xl"></div>
                        
                        <div className={`relative z-10 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                            <div className="inline-flex p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 mb-8">
                                <img 
                                    src="/logo.png" 
                                    alt="H2-MED Enterprises Logo" 
                                    className="h-20 w-auto"
                                />
                            </div>
                            
                            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                                POS Inventory
                            </h2>
                            
                            <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                                Complete inventory management and point-of-sale solution for modern pharmacies
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-6 mb-8">
                                <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                                    <span className="text-sm font-medium text-gray-700">Inventory</span>
                                </div>
                                <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                                    <span className="text-sm font-medium text-gray-700">Sales</span>
                                </div>
                                <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
                                    <span className="text-sm font-medium text-gray-700">Analytics</span>
                                </div>
                            </div>
                            
                            <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 max-w-sm mx-auto">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Why Choose Us?</h3>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start">
                                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Real-time inventory tracking
                                    </li>
                                    <li className="flex items-start">
                                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Advanced reporting & analytics
                                    </li>
                                    <li className="flex items-start">
                                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Secure & reliable platform
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-8 text-center text-xs text-gray-500 relative z-10">
                            © 2025 H2-MED Enterprises. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}