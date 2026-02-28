import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data));
  }, [token]);

  if (!stats) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard {user?.role === 'superadmin' ? 'Global' : 'da Loja'}</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {user?.role === 'superadmin' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Lojas</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalStores}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Package size={24} />
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Produtos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Movimentações</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalMovements}</p>
            </div>
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      {stats.salesByDay && stats.salesByDay.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
            <TrendingUp size={20} className="mr-2 text-indigo-600" />
            Vendas por Dia (Últimos 7 dias)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Vendas']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Financial Report (Superadmin Only) */}
      {user?.role === 'superadmin' && stats.financial && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
            <DollarSign size={20} className="mr-2 text-green-600" />
            Relatório Financeiro de Solicitações
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overdue */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <h4 className="font-semibold text-red-800 flex items-center mb-3">
                <AlertCircle size={18} className="mr-2" />
                Atrasados
              </h4>
              <div className="space-y-3">
                {stats.financial.overdue.map((r: any) => (
                  <div key={r.id} className="bg-white p-3 rounded border border-red-100 text-sm">
                    <p className="font-bold text-gray-800">{r.client_name}</p>
                    <p className="text-xs text-gray-500">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Venceu: {new Date(r.payment_due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {stats.financial.overdue.length === 0 && <p className="text-xs text-gray-500">Nenhum pagamento atrasado.</p>}
              </div>
            </div>

            {/* Pending */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <h4 className="font-semibold text-yellow-800 flex items-center mb-3">
                <Clock size={18} className="mr-2" />
                A Prazo (Pendentes)
              </h4>
              <div className="space-y-3">
                {stats.financial.pending.map((r: any) => (
                  <div key={r.id} className="bg-white p-3 rounded border border-yellow-100 text-sm">
                    <p className="font-bold text-gray-800">{r.client_name}</p>
                    <p className="text-xs text-gray-500">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-yellow-600 font-medium mt-1">
                      Vence: {new Date(r.payment_due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {stats.financial.pending.length === 0 && <p className="text-xs text-gray-500">Nenhum pagamento pendente.</p>}
              </div>
            </div>

            {/* Paid */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h4 className="font-semibold text-green-800 flex items-center mb-3">
                <CheckCircle size={18} className="mr-2" />
                Pagos Recentemente
              </h4>
              <div className="space-y-3">
                {stats.financial.paid.map((r: any) => (
                  <div key={r.id} className="bg-white p-3 rounded border border-green-100 text-sm">
                    <p className="font-bold text-gray-800">{r.client_name}</p>
                    <p className="text-xs text-gray-500">{r.store_name} - {r.product_name}</p>
                    <p className="text-xs text-green-600 font-medium mt-1">
                      Pago
                    </p>
                  </div>
                ))}
                {stats.financial.paid.length === 0 && <p className="text-xs text-gray-500">Nenhum pagamento recente.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-600">
            <AlertTriangle size={20} className="mr-2" />
            Estoque Baixo
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Produto</th>
                  <th className="px-4 py-2">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-red-600 font-bold">{p.stock_quantity}</td>
                  </tr>
                ))}
                {stats.lowStock.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-center text-gray-500">Nenhum produto com estoque baixo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Últimas Movimentações</h3>
          <div className="space-y-4">
            {stats.recentMovements.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{m.product_name}</p>
                  <p className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</p>
                </div>
                <div className={`flex items-center font-bold ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                  {m.type === 'in' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  {m.quantity}
                </div>
              </div>
            ))}
             {stats.recentMovements.length === 0 && (
                <p className="text-center text-gray-500 text-sm">Nenhuma movimentação recente.</p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
