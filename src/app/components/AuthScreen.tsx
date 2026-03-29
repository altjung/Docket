import { useState } from 'react';
import { motion } from 'motion/react';
import { getSupabaseClient, API_BASE } from '/src/lib/supabase';
import { publicAnonKey } from '/utils/supabase/info';

interface AuthScreenProps {
  onAuthSuccess: (accessToken: string) => void;
  onSkipAuth: () => void;
}

export default function AuthScreen({ onAuthSuccess, onSkipAuth }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();

  const handleSignUp = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Create user on backend
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password, name }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        // If user already exists, show message to sign in instead
        if (result.error && result.error.includes('already been registered')) {
          setError('This email is already registered. Please sign in instead.');
          setIsSignUp(false); // Switch to sign in mode
        } else {
          setError(result.error || 'Failed to sign up');
        }
        setLoading(false);
        return;
      }
      
      // Sign in after successful signup
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError || !data.session) {
        setError(signInError?.message || 'Failed to sign in after signup');
        setLoading(false);
        return;
      }
      
      onAuthSuccess(data.session.access_token);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError || !data.session) {
        setError(signInError?.message || 'Failed to sign in');
        setLoading(false);
        return;
      }
      
      onAuthSuccess(data.session.access_token);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-full bg-black flex items-center justify-center px-[24px] py-[48px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <h1 className="font-['Inter:Bold',sans-serif] text-[32px] text-white mb-[8px] text-center">
          Docket
        </h1>
        <p className="font-['Inter:Regular',sans-serif] text-[16px] text-[#999] mb-[32px] text-center">
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-[16px]">
          {isSignUp && (
            <div>
              <label className="font-['Inter:Medium',sans-serif] text-[14px] text-white block mb-[8px]">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-[16px] py-[12px] bg-[#1a1a1a] rounded-[12px] font-['Inter:Regular',sans-serif] text-[16px] text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                placeholder="Enter your name"
                required
              />
            </div>
          )}
          
          <div>
            <label className="font-['Inter:Medium',sans-serif] text-[14px] text-white block mb-[8px]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-[16px] py-[12px] bg-[#1a1a1a] rounded-[12px] font-['Inter:Regular',sans-serif] text-[16px] text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="font-['Inter:Medium',sans-serif] text-[14px] text-white block mb-[8px]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-[16px] py-[12px] bg-[#1a1a1a] rounded-[12px] font-['Inter:Regular',sans-serif] text-[16px] text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-900/20 border border-red-500/50 rounded-[12px] p-[12px]"
            >
              <p className="font-['Inter:Regular',sans-serif] text-[14px] text-red-400">
                {error}
              </p>
            </motion.div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#bfe260] text-black rounded-[12px] py-[14px] font-['Inter:SemiBold',sans-serif] text-[16px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </motion.button>
        </form>
        
        <div className="mt-[24px] text-center space-y-[12px]">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="font-['Inter:Regular',sans-serif] text-[14px] text-[#4A90E2] cursor-pointer hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
          
          <div className="pt-[8px] border-t border-[#333]">
            <p className="font-['Inter:Regular',sans-serif] text-[12px] text-[#666] mb-[8px]">
              Or use the app offline without syncing
            </p>
            <button
              onClick={onSkipAuth}
              className="font-['Inter:Medium',sans-serif] text-[14px] text-[#999] cursor-pointer hover:text-white transition-colors"
            >
              Continue without account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}