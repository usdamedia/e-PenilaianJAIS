
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Beaker } from 'lucide-react';
import { Input } from '../components/Input';

interface AdminLoginProps {
  onLogin: (isSandbox?: boolean) => void;
  onBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple mock auth
      onLogin();
    } else {
      setError('Kata laluan tidak sah');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-soft p-8 md:p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-200 rounded-full blur-3xl opacity-30 -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-dark rounded-full blur-3xl opacity-5 -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-dark font-bold flex items-center gap-1 transition-colors">
                ← KEMBALI
            </button>
          </div>
          
          <div className="w-16 h-16 bg-dark text-lime-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-lime-400/20">
            <Lock size={28} />
          </div>
          
          <h2 className="text-2xl font-extrabold text-dark mb-2">Admin Portal</h2>
          <p className="text-gray-500 mb-8 text-sm">Sila masukkan kata laluan untuk mengakses papan pemuka pentadbir.</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="KATA LALUAN"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="••••••••"
              error={error}
            />
            
            <div className="space-y-3">
              <button 
                type="submit"
                className="w-full bg-lime-400 text-dark font-bold py-4 rounded-2xl hover:bg-lime-500 transition-all flex items-center justify-center gap-2 shadow-glow active:scale-95"
              >
                LOG MASUK
                <ArrowRight size={18} />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400 font-bold tracking-widest">ATAU</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => onLogin(true)}
                className="w-full bg-gray-50 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-100 hover:text-dark transition-all flex items-center justify-center gap-2 border border-gray-100 active:scale-95 group"
              >
                <Beaker size={18} className="group-hover:text-lime-600 transition-colors" />
                MOD SANDBOX (DEMO)
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
            <ShieldCheck size={14} />
            Sistem Dilindungi JAIS
          </div>
        </div>
      </div>
    </div>
  );
};
