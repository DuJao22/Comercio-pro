import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Save } from 'lucide-react';

export default function Profile() {
  const { token, user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          email, 
          currentPassword: currentPassword || undefined, 
          password: newPassword || undefined 
        })
      });

      if (res.ok) {
        alert('Perfil atualizado com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Meu Perfil</h2>

      <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
        <form onSubmit={handleUpdate} className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center text-slate-200">
              <User size={20} className="mr-2 text-indigo-400" />
              Informações Pessoais
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                required
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center text-slate-200">
              <Lock size={20} className="mr-2 text-indigo-400" />
              Alterar Senha
            </h3>
            <p className="text-sm text-slate-300">Preencha apenas se desejar alterar sua senha.</p>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                placeholder="Necessário para alterar a senha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center"
            >
              <Save size={20} className="mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
