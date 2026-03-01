import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowUpCircle, ArrowDownCircle, History, Plus, MessageCircle, Factory } from 'lucide-react';

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
  weight: number;
  unit: string;
  store_id: number;
}

export default function Movements() {
  const { token, user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'movement' | 'production'>('movement');

  // Form state (Movement)
  const [type, setType] = useState<'in' | 'out'>('in');
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [productId, setProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [observation, setObservation] = useState('');
  
  // Fractional Sale State
  const [isFractional, setIsFractional] = useState(false);
  const [fractionalWeight, setFractionalWeight] = useState<number>(0);
  const [fractionalUnit, setFractionalUnit] = useState<'g' | 'kg'>('g');

  // New fields (Movement)
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // ... (existing code)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    let finalQuantity = quantity;
    let finalObservation = observation;

    // Fractional Logic Calculation
    if (type === 'out' && isFractional && productId) {
      const product = products.find(p => p.id === Number(productId));
      if (product && product.weight > 0) {
        let weightInGrams = fractionalWeight;
        if (fractionalUnit === 'kg') weightInGrams *= 1000;

        let productWeightInGrams = product.weight;
        if (product.unit === 'kg') productWeightInGrams *= 1000;
        
        // Calculate fraction: Sale Weight / Product Base Weight
        // e.g. 5g / 500g = 0.01
        finalQuantity = Number((weightInGrams / productWeightInGrams).toFixed(4));
        finalObservation = `Venda Fracionada: ${fractionalWeight}${fractionalUnit} (Equiv. ${finalQuantity} un) - ${observation}`;
      } else {
        alert('Erro: Produto não tem peso cadastrado para cálculo fracionado.');
        return;
      }
    }

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
          quantity: finalQuantity, 
          observation: finalObservation,
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
        setIsFractional(false);
        setFractionalWeight(0);
        fetchData(); // Refresh list
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao registrar');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceProductId || !targetProductId) return;

    try {
      const res = await fetch('/api/movements/production', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          source_product_id: sourceProductId,
          target_product_id: targetProductId,
          quantity_produced: productionQuantity,
          quantity_consumed: consumptionQuantity
        })
      });

      if (res.ok) {
        alert('Produção registrada com sucesso!');
        setProductionQuantity(1);
        setConsumptionQuantity(0);
        setSourceProductId('');
        setTargetProductId('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao registrar produção');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Controle de Estoque</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-1 bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 h-fit">
          
          {/* Tabs */}
          <div className="flex space-x-2 mb-6 border-b border-slate-700 pb-2">
            <button
              onClick={() => setActiveTab('movement')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === 'movement' 
                  ? 'text-indigo-400 border-b-2 border-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Movimentação
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === 'production' 
                  ? 'text-indigo-400 border-b-2 border-indigo-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Produção / Fracionar
            </button>
          </div>

          {activeTab === 'movement' ? (
            <>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
                <Plus size={20} className="mr-2 text-indigo-400" />
                Nova Movimentação
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Tipo de Movimentação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('in')}
                      className={`py-2 px-4 rounded-lg flex items-center justify-center border ${
                        type === 'in' 
                          ? 'bg-green-900/30 border-green-700 text-green-400 font-medium' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowUpCircle size={18} className="mr-2" /> Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('out')}
                      className={`py-2 px-4 rounded-lg flex items-center justify-center border ${
                        type === 'out' 
                          ? 'bg-red-900/30 border-red-700 text-red-400 font-medium' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowDownCircle size={18} className="mr-2" /> Saída
                    </button>
                  </div>
                </div>

                {user?.role === 'superadmin' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Loja</label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => {
                        setSelectedStoreId(Number(e.target.value));
                        setProductId(''); // Reset product when store changes
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      required
                    >
                      <option value="">Selecione uma loja...</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Produto</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                    required
                    disabled={user?.role === 'superadmin' && !selectedStoreId}
                  >
                    <option value="">Selecione um produto...</option>
                    {filteredProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Atual: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fractional Sale Option */}
                {type === 'out' && (
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isFractional} 
                        onChange={(e) => setIsFractional(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-indigo-600 rounded border-slate-600 bg-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-200 font-medium">Venda Fracionada / A Granel</span>
                    </label>
                    
                    {isFractional && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Peso da Venda</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fractionalWeight}
                            onChange={(e) => setFractionalWeight(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white text-sm"
                            placeholder="Ex: 5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                          <select
                            value={fractionalUnit}
                            onChange={(e) => setFractionalUnit(e.target.value as 'g' | 'kg')}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white text-sm"
                          >
                            <option value="g">Gramas (g)</option>
                            <option value="kg">Quilos (kg)</option>
                          </select>
                        </div>
                        <div className="col-span-2 mt-1">
                           <p className="text-xs text-indigo-400">
                             {productId && fractionalWeight > 0 ? (
                               (() => {
                                 const p = products.find(prod => prod.id === Number(productId));
                                 if (!p || !p.weight) return "Selecione um produto com peso cadastrado.";
                                 
                                 let saleGrams = fractionalWeight;
                                 if (fractionalUnit === 'kg') saleGrams *= 1000;
                                 
                                 let baseGrams = p.weight;
                                 if (p.unit === 'kg') baseGrams *= 1000;
                                 
                                 const discount = saleGrams / baseGrams;
                                 return `Será descontado ${discount.toFixed(4)} unidades do estoque de ${p.name}.`;
                               })()
                             ) : (
                               "O sistema descontará a proporção exata do estoque principal."
                             )}
                           </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isFractional && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Quantidade (Unidades)</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      required
                    />
                  </div>
                )}

                {/* Client Info Fields */}
                <div className="border-t border-slate-800 pt-4 mt-4">
                  <p className="text-sm font-semibold text-slate-200 mb-3">Dados do Cliente / Pagamento</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Cliente</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                        placeholder="Opcional"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Contato (Tel/Zap)</label>
                      <input
                        type="text"
                        value={clientContact}
                        onChange={(e) => setClientContact(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Status Pagamento</label>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                        >
                          <option value="paid">Pago</option>
                          <option value="pending">Pendente</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Previsão Pagamento</label>
                        <input
                          type="date"
                          value={paymentDueDate}
                          onChange={(e) => setPaymentDueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Observação (Opcional)</label>
                  <textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
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
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
                <Factory size={20} className="mr-2 text-indigo-400" />
                Produção / Fracionamento
              </h3>
              
              <form onSubmit={handleProductionSubmit} className="space-y-4">
                {user?.role === 'superadmin' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Loja</label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => {
                        setSelectedStoreId(Number(e.target.value));
                        setSourceProductId('');
                        setTargetProductId('');
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      required
                    >
                      <option value="">Selecione uma loja...</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Produto Origem (Matéria Prima)</label>
                  <select
                    value={sourceProductId}
                    onChange={(e) => setSourceProductId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                    required
                    disabled={user?.role === 'superadmin' && !selectedStoreId}
                  >
                    <option value="">Selecione a origem...</option>
                    {productionProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.weight}{p.unit}) - Estoque: {p.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Produto Destino (Final)</label>
                  <select
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                    required
                    disabled={user?.role === 'superadmin' && !selectedStoreId}
                  >
                    <option value="">Selecione o destino...</option>
                    {productionProducts.filter(p => p.id !== sourceProductId).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.weight}{p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-400 mb-1">Quantidade a Produzir (Destino)</label>
                    <input
                      type="number"
                      min="1"
                      value={productionQuantity}
                      onChange={(e) => setProductionQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Serão adicionados ao estoque do produto destino.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-red-400 mb-1">Consumo Estimado (Origem)</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={consumptionQuantity}
                      onChange={(e) => setConsumptionQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Serão removidos do estoque do produto origem.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Confirmar Produção
                </button>
              </form>
            </>
          )}
        </div>

        {/* History List */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <History size={20} className="mr-2 text-slate-400" />
            Histórico Recente
          </h3>
          
          <div className="space-y-4">
            {movements.map((m: any) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-slate-800 rounded-lg border border-slate-700 gap-4">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 p-2 rounded-full ${m.type === 'in' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {m.type === 'in' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{m.product_name}</p>
                    <p className="text-sm text-slate-300">
                      {m.type === 'in' ? 'Entrada' : 'Saída'} por <span className="font-medium text-slate-200">{m.user_name}</span>
                    </p>
                    {m.client_name && (
                      <div className="mt-1 flex items-center space-x-2">
                        <div className="text-xs text-slate-200 bg-slate-700 px-2 py-1 rounded inline-block">
                          Cliente: {m.client_name} {m.client_contact ? `(${m.client_contact})` : ''}
                        </div>
                        {m.client_contact && (
                          <a 
                            href={`https://wa.me/${m.client_contact.replace(/\D/g, '')}?text=Olá ${m.client_name}, referente à sua compra de ${m.quantity}x ${m.product_name}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 transition-colors"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </a>
                        )}
                      </div>
                    )}
                    {m.observation && <p className="text-xs text-slate-400 mt-1 italic">"{m.observation}"</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString()}</p>
                  
                  {m.payment_status && (
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded inline-block ${
                      m.payment_status === 'paid' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
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
              <p className="text-center text-slate-400 py-8">Nenhuma movimentação registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
