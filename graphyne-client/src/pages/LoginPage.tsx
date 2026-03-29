import React, { useState } from 'react';
import { signIn } from '../lib/auth-client';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await signIn.email({ email, password });
    
    if (error) {
      setError(error.message || 'Login failed');
      setLoading(false);
    } else {
      window.location.href = '/'; // Redirect to editor
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
      <form onSubmit={handleLogin} className="bg-zinc-800 p-8 rounded-lg shadow-xl w-96 flex flex-col gap-4">
        <div className="flex justify-center mb-4">
          <img src="/TransLogo.png" alt="Graphyne" className="h-12" />
        </div>
        
        {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-2 rounded text-sm">{error}</div>}

        <input type="email" placeholder="Email" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={password} onChange={e => setPassword(e.target.value)} />
        
        <button type="submit" disabled={loading} className="mt-4 bg-blue-600 hover:bg-blue-500 p-2 rounded font-bold disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};