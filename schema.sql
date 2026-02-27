-- Schema do Banco de Dados SQLite (commerce.db)

-- Tabela de Lojas
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin')),
  store_id INTEGER,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  weight REAL,
  unit TEXT,
  stock_quantity INTEGER DEFAULT 0,
  image TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Tabela de Movimentações (Estoque)
CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  observation TEXT,
  client_name TEXT,
  client_contact TEXT,
  payment_status TEXT CHECK(payment_status IN ('paid', 'pending')),
  payment_due_date TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de Solicitações (Pedidos do Superadmin para Lojas)
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed')),
  client_name TEXT,
  client_phone TEXT,
  payment_status TEXT CHECK(payment_status IN ('paid', 'pending')),
  payment_due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela de Remessas (Envio de produtos entre lojas/estoque central)
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  destination_store_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'received')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_store_id) REFERENCES stores(id)
);
