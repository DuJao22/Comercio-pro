import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Clock, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar dados');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => setError(err.message));
  }, [token]);

  if (error) return <div className="text-red-500 p-4">Erro: {error}</div>;
  if (!stats) return <div className="text-slate-400 p-4">Carregando dashboard...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard {user?.role === 'superadmin' ? 'Global' : 'da Loja'}</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {user?.role === 'superadmin' && (
          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Total de Lojas</p>
                <p className="text-3xl font-bold text-white">{stats.totalStores}</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <Package size={24} />
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Total de Produtos</p>
              <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Movimentações</p>
              <p className="text-3xl font-bold text-white">{stats.totalMovements}</p>
            </div>
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      {stats.salesByDay && stats.salesByDay.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <TrendingUp size={20} className="mr-2 text-indigo-500" />
            Vendas por Dia (Últimos 7 dias)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  tick={{ fontSize: 12, fill: '#cbd5e1' }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={{ stroke: '#334155' }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Vendas']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Financial Report (Superadmin Only) */}
      {user?.role === 'superadmin' && stats.financial && (
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
            <DollarSign size={20} className="mr-2 text-green-500" />
            Relatório Financeiro de Solicitações
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overdue */}
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
              <h4 className="font-semibold text-red-400 flex items-center mb-3">
                <AlertCircle size={18} className="mr-2" />
                Atrasados
              </h4>
              <div className="space-y-3">
                {stats.financial.overdue.map((r: any) => (
                  <div key={r.id} className="bg-slate-800 p-3 rounded border border-red-500/20 text-sm">
                    <p className="font-bold text-white">{r.client_name}</p>
                    <p className="text-xs text-slate-300">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-red-400 font-medium mt-1">
                      Venceu: {new Date(r.payment_due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {stats.financial.overdue.length === 0 && <p className="text-xs text-slate-500">Nenhum pagamento atrasado.</p>}
              </div>
            </div>

            {/* Pending */}
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
              <h4 className="font-semibold text-yellow-400 flex items-center mb-3">
                <Clock size={18} className="mr-2" />
                A Prazo (Pendentes)
              </h4>
              <div className="space-y-3">
                {stats.financial.pending.map((r: any) => (
                  <div key={r.id} className="bg-slate-800 p-3 rounded border border-yellow-500/20 text-sm">
                    <p className="font-bold text-white">{r.client_name}</p>
                    <p className="text-xs text-slate-300">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-yellow-400 font-medium mt-1">
                      Vence: {new Date(r.payment_due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {stats.financial.pending.length === 0 && <p className="text-xs text-slate-500">Nenhum pagamento pendente.</p>}
              </div>
            </div>

            {/* Paid */}
            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-green-400 flex items-center mb-3">
                <CheckCircle size={18} className="mr-2" />
                Pagos Recentemente
              </h4>
              <div className="space-y-3">
                {stats.financial.paid.map((r: any) => (
                  <div key={r.id} className="bg-slate-800 p-3 rounded border border-green-500/20 text-sm">
                    <p className="font-bold text-white">{r.client_name}</p>
                    <p className="text-xs text-slate-300">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-green-400 font-medium mt-1">
                      Pago
                    </p>
                  </div>
                ))}
                {stats.financial.paid.length === 0 && <p className="text-xs text-slate-500">Nenhum pagamento recente.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-400">
            <AlertTriangle size={20} className="mr-2" />
            Estoque Baixo
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-300 uppercase bg-slate-800">
                <tr>
                  <th className="px-4 py-2">Produto</th>
                  <th className="px-4 py-2">Loja</th>
                  <th className="px-4 py-2">Qtd</th>
                  <th className="px-4 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock && stats.lowStock.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-800">
                    <td className="px-4 py-2 font-medium text-slate-200">{p.name}</td>
                    <td className="px-4 py-2 text-slate-400">{p.store_name}</td>
                    <td className="px-4 py-2 text-red-400 font-bold">{p.stock_quantity}</td>
                    <td className="px-4 py-2">
                      {p.manager_phone ? (
                        <a 
                          href={`https://wa.me/${p.manager_phone.replace(/\D/g, '')}?text=Olá ${p.manager_name || 'Gerente'}, o produto ${p.name} está com baixo estoque (${p.stock_quantity} unidades). Gostaria de solicitar um novo pedido.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 transition-colors flex items-center"
                          title="Solicitar Pedido via WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">Sem contato</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!stats.lowStock || stats.lowStock.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-center text-slate-500">Nenhum produto com estoque baixo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-white">Últimas Movimentações</h3>
          <div className="space-y-4">
            {stats.recentMovements.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-800 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-white">{m.product_name}</p>
                  <p className="text-xs text-slate-300">{new Date(m.timestamp).toLocaleString()}</p>
                </div>
                <div className={`flex items-center font-bold ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                  {m.type === 'in' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  {m.quantity}
                </div>
              </div>
            ))}
             {stats.recentMovements.length === 0 && (
                <p className="text-center text-slate-500 text-sm">Nenhuma movimentação recente.</p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
