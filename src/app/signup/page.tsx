'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaYoutube } from 'react-icons/fa';
import Link from 'next/link';
import { secureAuth } from '@/lib/secure-auth';
import { useTheme } from '@/contexts/ThemeContext';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await secureAuth.signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <FaYoutube className="text-red-500 text-4xl mr-2" />
              <h1 className="text-3xl font-bold dark:text-white">ClikStats</h1>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Check Your Email</h2>
            
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 mb-6">
              <p className="text-green-700 dark:text-green-300">
                We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox and spam folder.
              </p>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              After confirming your email, you'll be able to log in and start using TubeIntel Pro.
            </p>
            
            <div className="flex flex-col space-y-4">
              <Link 
                href="/login"
                className="w-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-center py-2 px-4 rounded-md font-medium"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <FaYoutube className="text-red-500 text-4xl mr-2" />
            <h1 className="text-3xl font-bold dark:text-white">ClikStats</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Create your account</p>
        </div>
        
        {/* Signup Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Sign Up</h2>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Create a password"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 6 characters
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Confirm your password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account? <Link href="/login" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Log in</Link>
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Email Confirmation Required</span>: After signing up, 
            you'll need to confirm your email address before you can log in.
          </p>
        </div>
      </div>
    </div>
  );
} 