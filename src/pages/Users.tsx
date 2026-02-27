import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, UserPlus, Trash, Store } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin';
  store_id?: number;
  store_name?: string;
}

interface Store {
  id: number;
  name: string;
}

export default function Users() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
  const [storeId, setStoreId] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, storeRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (userRes.ok) setUsers(await userRes.json());
      if (storeRes.ok) setStores(await storeRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchData();
    }
  }, [token, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role, store_id: storeId })
      });

      if (res.ok) {
        setName('');
        setEmail('');
        setPassword('');
        setRole('admin');
        setStoreId('');
        fetchData();
        alert('Usuário criado com sucesso!');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (user?.role !== 'superadmin') {
    return <div className="text-center p-8 text-gray-500">Acesso restrito a Superadmin.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <UserPlus size={20} className="mr-2 text-indigo-600" />
            Novo Usuário
          </h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="admin">Admin de Loja</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loja Vinculada</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Selecione uma loja...</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Criar Usuário
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <UsersIcon size={20} className="mr-2 text-gray-600" />
            Usuários Cadastrados
          </h3>
          
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 p-2 rounded-full ${
                    u.role === 'superadmin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <UsersIcon size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                      {u.store_name && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Store size={12} className="mr-1" />
                          {u.store_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {u.id !== user?.id && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Usuário"
                  >
                    <Trash size={18} />
                  </button>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
