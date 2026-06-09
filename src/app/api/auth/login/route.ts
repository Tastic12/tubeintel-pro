import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing email or password' },
        { status: 400 }
      );
    }
    
    // Get the Supabase client
    const supabase = createClient();
    
    // Log in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    
    // Create response
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: data.user?.id,
        email: data.user?.email
      } 
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Auth login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred during login' },
      { status: 500 }
    );
  }
} 