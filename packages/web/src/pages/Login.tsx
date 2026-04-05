import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Mail, Lock, User, Loader } from 'lucide-react';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Demo mode: allow entering without backend
  const handleDemo = () => {
    const demoUser = { id: 'demo', email: 'demo@angel.ai', name: 'Demo User', createdAt: new Date().toISOString() };
    localStorage.setItem('angel_token', 'demo-token');
    localStorage.setItem('angel_user', JSON.stringify(demoUser));
    window.location.href = '/';
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Sparkles size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Angel AI</h1>
          <p className="text-xs text-text-secondary">Your personal AI companion</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        <h2 className="text-lg font-semibold text-text text-center">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {isRegister && (
          <div className="relative">
            <User
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isRegister}
              className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        <div className="relative">
          <Mail
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="relative">
          <Lock
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader size={16} className="animate-spin-slow" />}
          {isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="w-full py-2 text-sm text-text-secondary hover:text-text transition-colors"
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-bg px-3 text-text-tertiary">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDemo}
          className="w-full py-3 rounded-xl text-sm font-medium text-text-secondary bg-surface hover:bg-surface-hover transition-colors"
        >
          Try Demo Mode
        </button>
      </form>
    </div>
  );
}
