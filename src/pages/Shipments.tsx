import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, CheckCircle, Clock, Send } from 'lucide-react';

interface Shipment {
  id: number;
  product_name: string;
  quantity: number;
  destination_store_id: number;
  store_name: string;
  status: 'pending' | 'sent' | 'received';
  created_at: string;
}

interface Store {
  id: number;
  name: string;
}

export default function Shipments() {
  const { token, user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [destinationStoreId, setDestinationStoreId] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipRes, storeRes] = await Promise.all([
        fetch('/api/shipments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (shipRes.ok) setShipments(await shipRes.json());
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
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ product_name: productName, quantity, destination_store_id: destinationStoreId })
      });

      if (res.ok) {
        setProductName('');
        setQuantity(1);
        setDestinationStoreId('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/shipments/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (user?.role !== 'superadmin') {
    return <div className="text-center p-8 text-gray-500">Acesso restrito a Superadmin.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Gestão de Remessas</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Send size={20} className="mr-2 text-indigo-600" />
            Nova Remessa
          </h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Nome do produto..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loja Destino</label>
              <select
                value={destinationStoreId}
                onChange={(e) => setDestinationStoreId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">Selecione uma loja...</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Solicitar Remessa
            </button>
          </form>
        </div>

        {/* Shipments List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Truck size={20} className="mr-2 text-gray-600" />
            Remessas Recentes
          </h3>
          
          <div className="space-y-4">
            {shipments.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 p-2 rounded-full ${
                    s.status === 'received' ? 'bg-green-100 text-green-600' : 
                    s.status === 'sent' ? 'bg-blue-100 text-blue-600' : 
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {s.status === 'received' ? <CheckCircle size={20} /> : 
                     s.status === 'sent' ? <Truck size={20} /> : 
                     <Clock size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{s.product_name} ({s.quantity})</p>
                    <p className="text-sm text-gray-500">Para: <span className="font-medium">{s.store_name}</span></p>
                    <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {s.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(s.id, 'sent')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Marcar Enviado
                    </button>
                  )}
                  {s.status === 'sent' && (
                    <button
                      onClick={() => updateStatus(s.id, 'received')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Confirmar Recebimento
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                    s.status === 'received' ? 'bg-green-100 text-green-800' : 
                    s.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {s.status === 'received' ? 'Recebido' : s.status === 'sent' ? 'Enviado' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
            {shipments.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma remessa registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
