import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store as StoreIcon, MapPin, Plus } from 'lucide-react';

interface Store {
  id: number;
  name: string;
  location: string;
}

export default function Stores() {
  const { token, user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStores(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchStores();
    }
  }, [token, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, location })
      });

      if (res.ok) {
        setName('');
        setLocation('');
        fetchStores();
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
      <h2 className="text-2xl font-bold text-gray-800">Gestão de Lojas</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Plus size={20} className="mr-2 text-indigo-600" />
            Nova Loja
          </h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Loja Centro"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Rua Principal, 123"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Cadastrar Loja
            </button>
          </form>
        </div>

        {/* Stores List */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stores.map((s) => (
            <div key={s.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <StoreIcon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{s.name}</h4>
                <p className="text-gray-500 flex items-center mt-1 text-sm">
                  <MapPin size={16} className="mr-1" />
                  {s.location}
                </p>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
            <p className="col-span-2 text-center text-gray-500 py-8">Nenhuma loja cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
