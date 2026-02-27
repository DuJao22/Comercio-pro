import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowUpCircle, ArrowDownCircle, History, Plus } from 'lucide-react';

interface Movement {
  id: number;
  product_name: string;
  type: 'in' | 'out';
  quantity: number;
  user_name: string;
  timestamp: string;
  observation: string;
}

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
}

export default function Movements() {
  const { token } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [type, setType] = useState<'in' | 'out'>('in');
  const [productId, setProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [observation, setObservation] = useState('');
  
  // New fields
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const movData = await movRes.json();
      const prodData = await prodRes.json();
      
      setMovements(movData.recentMovements || []);
      setProducts(prodData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          product_id: productId, 
          type, 
          quantity, 
          observation,
          client_name: clientName,
          client_contact: clientContact,
          payment_status: paymentStatus,
          payment_due_date: paymentDueDate
        })
      });

      if (res.ok) {
        alert('Movimentação registrada com sucesso!');
        setQuantity(1);
        setObservation('');
        setClientName('');
        setClientContact('');
        setPaymentStatus('paid');
        setPaymentDueDate('');
        fetchData(); // Refresh list
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao registrar');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Controle de Estoque</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Plus size={20} className="mr-2 text-indigo-600" />
            Nova Movimentação
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimentação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('in')}
                  className={`py-2 px-4 rounded-lg flex items-center justify-center border ${
                    type === 'in' 
                      ? 'bg-green-50 border-green-200 text-green-700 font-medium' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpCircle size={18} className="mr-2" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setType('out')}
                  className={`py-2 px-4 rounded-lg flex items-center justify-center border ${
                    type === 'out' 
                      ? 'bg-red-50 border-red-200 text-red-700 font-medium' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownCircle size={18} className="mr-2" /> Saída
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Atual: {p.stock_quantity})
                  </option>
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

            {/* Client Info Fields */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">Dados do Cliente / Pagamento</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Opcional"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contato (Tel/Zap)</label>
                  <input
                    type="text"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Opcional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status Pagamento</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="paid">Pago</option>
                      <option value="pending">Pendente</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Previsão Pagamento</label>
                    <input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação (Opcional)</label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={2}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Registrar Movimentação
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History size={20} className="mr-2 text-gray-600" />
            Histórico Recente
          </h3>
          
          <div className="space-y-4">
            {movements.map((m: any) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 p-2 rounded-full ${m.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {m.type === 'in' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{m.product_name}</p>
                    <p className="text-sm text-gray-500">
                      {m.type === 'in' ? 'Entrada' : 'Saída'} por <span className="font-medium">{m.user_name}</span>
                    </p>
                    {m.client_name && (
                      <div className="mt-1 text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded inline-block">
                        Cliente: {m.client_name} {m.client_contact ? `(${m.client_contact})` : ''}
                      </div>
                    )}
                    {m.observation && <p className="text-xs text-gray-400 mt-1 italic">"{m.observation}"</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString()}</p>
                  
                  {m.payment_status && (
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded inline-block ${
                      m.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {m.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}
                      {m.payment_status === 'pending' && m.payment_due_date && (
                        <span className="block font-normal text-[10px]">Vence: {new Date(m.payment_due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {movements.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma movimentação registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
