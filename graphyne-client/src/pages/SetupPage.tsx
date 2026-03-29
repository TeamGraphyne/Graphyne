import React, { useState } from 'react';

export const SetupPage = () => {
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Admin User');
  const [error, setError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/system/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, adminEmail: email, adminPassword: password, adminName: name })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate');
      
      alert('Activation successful! Please log in.');
      window.location.href = '/login';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
      <form onSubmit={handleActivate} className="bg-zinc-800 p-8 rounded-lg shadow-xl w-96 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">Graphyne Setup</h1>
        <p className="text-sm text-zinc-400 text-center mb-4">Activate your local instance.</p>
        
        {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-2 rounded text-sm">{error}</div>}

        <input placeholder="License Key" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={key} onChange={e => setKey(e.target.value)} />
        <hr className="border-zinc-700 my-2" />
        <h2 className="text-sm font-semibold text-zinc-300">Create Admin Account</h2>
        <input placeholder="Name" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={name} onChange={e => setName(e.target.value)} />
        <input type="email" placeholder="Email" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="p-2 rounded bg-zinc-950 border border-zinc-700" required value={password} onChange={e => setPassword(e.target.value)} />
        
        <button type="submit" className="mt-4 bg-blue-600 hover:bg-blue-500 p-2 rounded font-bold transition-colors">
          Activate & Create Admin
        </button>
      </form>
    </div>
  );
};