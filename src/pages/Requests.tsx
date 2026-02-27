import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, CheckCircle, Clock, Plus } from 'lucide-react';

interface RequestItem {
  id: number;
  store_name: string;
  product_name: string;
  quantity: number;
  status: 'pending' | 'completed';
  created_at: string;
}

interface Store {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  store_id: number;
  stock_quantity: number;
}

export default function Requests() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, storeRes, prodRes] = await Promise.all([
        fetch('/api/requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (reqRes.ok) setRequests(await reqRes.json());
      if (storeRes.ok) setStores(await storeRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          store_id: selectedStoreId, 
          product_id: selectedProductId, 
          quantity,
          client_name: clientName,
          client_phone: clientPhone,
          payment_status: paymentStatus,
          payment_due_date: paymentDueDate
        })
      });

      if (res.ok) {
        setSelectedStoreId('');
        setSelectedProductId('');
        setQuantity(1);
        setClientName('');
        setClientPhone('');
        setPaymentStatus('paid');
        setPaymentDueDate('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const markCompleted = async (id: number) => {
    try {
      await fetch(`/api/requests/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // Filter products based on selected store
  const filteredProducts = products.filter(p => p.store_id === Number(selectedStoreId));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Solicitações de Produtos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form - Superadmin Only */}
        {user?.role === 'superadmin' && (
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Plus size={20} className="mr-2 text-indigo-600" />
              Nova Solicitação
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loja</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => {
                    setSelectedStoreId(Number(e.target.value));
                    setSelectedProductId(''); // Reset product when store changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Selecione uma loja...</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  disabled={!selectedStoreId}
                >
                  <option value="">Selecione um produto...</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock_quantity})</option>
                  ))}
                </select>
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

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Enviar Solicitação
              </button>
            </form>
          </div>
        )}

        {/* Requests List - Full width for admin, partial for superadmin */}
        <div className={`${user?.role === 'superadmin' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-6 rounded-xl shadow-sm border border-gray-100`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ClipboardList size={20} className="mr-2 text-gray-600" />
            {user?.role === 'superadmin' ? 'Solicitações Recentes' : 'Solicitações Recebidas'}
          </h3>
          
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 p-2 rounded-full ${
                    r.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {r.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{r.product_name} ({r.quantity})</p>
                    <p className="text-sm text-gray-500">Loja: <span className="font-medium">{r.store_name}</span></p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {r.status === 'pending' && (
                    <button
                      onClick={() => markCompleted(r.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      {user?.role === 'superadmin' ? 'Concluir' : 'Marcar como Atendido'}
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                    r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.status === 'completed' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma solicitação registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
