import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db, { initDb } from './src/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

// Initialize DB
initDb().then(async () => {
  // Double check phone column existence
  try {
    const tableInfo = await db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasPhone = tableInfo.some(col => col.name === 'phone');
    
    if (!hasPhone) {
      await db.sql('ALTER TABLE users ADD COLUMN phone TEXT');
      console.log('Phone column added via secondary check');
    } else {
      console.log('Phone column already exists, skipping migration');
    }
  } catch (e: any) {
    console.error('Secondary migration check failed:', e);
  }
}).catch(console.error);

// Keep-alive for SQLite Cloud (every 5 minutes)
setInterval(async () => {
  try {
    await db.prepare('SELECT 1').get();
    console.log('Database keep-alive ping successful');
  } catch (error) {
    console.error('Database keep-alive ping failed:', error);
  }
}, 5 * 60 * 1000);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware for authentication
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        console.log('Token expired, sending 403');
      } else {
        console.error('JWT Verification Error:', err.message);
      }
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Health Check DB
app.get('/api/health-db', async (req, res) => {
  try {
    await db.prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: (error as any).message });
  }
});

// Auth
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.prepare(`
      SELECT u.*, s.name as store_name 
      FROM users u 
      LEFT JOIN stores s ON u.store_id = s.id 
      WHERE u.email = ?
    `).get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, store_id: user.store_id, name: user.name }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, store_id: user.store_id, store_name: user.store_name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Dashboard Stats
app.get('/api/dashboard', authenticateToken, async (req: any, res) => {
  const { role } = req.user;
  const store_id = req.user.store_id || null; // Ensure store_id is not undefined
  console.log(`Dashboard request for role: ${role}, store_id: ${store_id}`);
  
  try {
    let stats: any = {};

    if (role === 'superadmin') {
      try {
        stats.totalStores = (await db.prepare('SELECT count(*) as count FROM stores').get() as any)?.count || 0;
      } catch (e) { console.error('Error fetching stores count:', e); stats.totalStores = 0; }

      try {
        stats.totalProducts = (await db.prepare('SELECT count(*) as count FROM products').get() as any)?.count || 0;
      } catch (e) { console.error('Error fetching products count:', e); stats.totalProducts = 0; }

      try {
        stats.totalMovements = (await db.prepare('SELECT count(*) as count FROM movements').get() as any)?.count || 0;
      } catch (e) { console.error('Error fetching movements count:', e); stats.totalMovements = 0; }
      
      // Recent movements global
      try {
        stats.recentMovements = await db.prepare(`
          SELECT m.*, p.name as product_name, u.name as user_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN users u ON m.user_id = u.id 
          ORDER BY m.timestamp DESC LIMIT 5
        `).all();
      } catch (e) { console.error('Error fetching recent movements:', e); stats.recentMovements = []; }

      // Sales by day global
      try {
        stats.salesByDay = await db.prepare(`
          SELECT strftime('%Y-%m-%d', timestamp) as date, COALESCE(SUM(quantity), 0) as total
          FROM movements
          WHERE type = 'out'
          GROUP BY date
          ORDER BY date ASC
          LIMIT 7
        `).all();
      } catch (e) { console.error('Error fetching sales by day:', e); stats.salesByDay = []; }

      // Financial Report (Movements)
      const today = new Date().toISOString().split('T')[0];
      stats.financial = { paid: [], pending: [], overdue: [] };
      
      try {
        stats.financial.paid = await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'paid' AND m.type = 'out'
          ORDER BY m.timestamp DESC LIMIT 10
        `).all();
      } catch (e) { console.error('Error fetching financial paid:', e); }

      try {
        stats.financial.pending = await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'pending' AND m.type = 'out' AND (m.payment_due_date >= ? OR m.payment_due_date IS NULL)
          ORDER BY m.payment_due_date ASC LIMIT 10
        `).all(today);
      } catch (e) { console.error('Error fetching financial pending:', e); }

      try {
        stats.financial.overdue = await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'pending' AND m.type = 'out' AND m.payment_due_date < ?
          ORDER BY m.payment_due_date ASC
        `).all(today);
      } catch (e) { console.error('Error fetching financial overdue:', e); }

      // Low stock global
      try {
        stats.lowStock = await db.prepare(`
          SELECT p.*, s.name as store_name, u.name as manager_name, u.phone as manager_phone
          FROM products p
          JOIN stores s ON p.store_id = s.id
          LEFT JOIN users u ON u.store_id = s.id AND u.role = 'admin'
          WHERE p.stock_quantity < 10
        `).all();
      } catch (e) { 
        console.error('Error fetching low stock (primary):', e);
        // Fallback query without phone column if it fails (e.g. column missing)
        try {
          stats.lowStock = await db.prepare(`
            SELECT p.*, s.name as store_name, u.name as manager_name
            FROM products p
            JOIN stores s ON p.store_id = s.id
            LEFT JOIN users u ON u.store_id = s.id AND u.role = 'admin'
            WHERE p.stock_quantity < 10
          `).all();
          console.log('Low stock fetched using fallback query');
        } catch (e2) {
          console.error('Error fetching low stock (fallback):', e2);
          stats.lowStock = [];
        }
      }
    } else {
      // Admin (Store specific)
      try {
        stats.totalProducts = (await db.prepare('SELECT count(*) as count FROM products WHERE store_id = ?').get(store_id) as any)?.count || 0;
      } catch (e) { console.error('Error fetching admin products count:', e); stats.totalProducts = 0; }

      try {
        stats.totalMovements = (await db.prepare(`
          SELECT count(*) as count FROM movements m 
          JOIN products p ON m.product_id = p.id 
          WHERE p.store_id = ?
        `).get(store_id) as any)?.count || 0;
      } catch (e) { console.error('Error fetching admin movements count:', e); stats.totalMovements = 0; }

      // Sales by day store
      try {
        stats.salesByDay = await db.prepare(`
          SELECT strftime('%Y-%m-%d', m.timestamp) as date, COALESCE(SUM(m.quantity), 0) as total
          FROM movements m
          JOIN products p ON m.product_id = p.id
          WHERE m.type = 'out' AND p.store_id = ?
          GROUP BY date
          ORDER BY date ASC
          LIMIT 7
        `).all(store_id);
      } catch (e) { console.error('Error fetching admin sales by day:', e); stats.salesByDay = []; }

      // Recent movements store
      try {
        stats.recentMovements = await db.prepare(`
          SELECT m.*, p.name as product_name, u.name as user_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN users u ON m.user_id = u.id 
          WHERE p.store_id = ?
          ORDER BY m.timestamp DESC LIMIT 5
        `).all(store_id);
      } catch (e) { console.error('Error fetching admin recent movements:', e); stats.recentMovements = []; }

      // Low stock store
      try {
        stats.lowStock = await db.prepare(`
          SELECT p.*, s.name as store_name, u.name as manager_name, u.phone as manager_phone
          FROM products p
          JOIN stores s ON p.store_id = s.id
          LEFT JOIN users u ON u.store_id = s.id AND u.role = 'admin'
          WHERE p.store_id = ? AND p.stock_quantity < 10
        `).all(store_id);
      } catch (e) { 
        console.error('Error fetching admin low stock (primary):', e); 
        // Fallback query without phone
        try {
          stats.lowStock = await db.prepare(`
            SELECT p.*, s.name as store_name, u.name as manager_name
            FROM products p
            JOIN stores s ON p.store_id = s.id
            LEFT JOIN users u ON u.store_id = s.id AND u.role = 'admin'
            WHERE p.store_id = ? AND p.stock_quantity < 10
          `).all(store_id);
        } catch (e2) {
          console.error('Error fetching admin low stock (fallback):', e2);
          stats.lowStock = []; 
        }
      }
    }

    console.log('Dashboard data prepared successfully');
    res.json(stats);
  } catch (error) {
    console.error('CRITICAL DASHBOARD ERROR:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard: ' + (error as any).message });
  }
});

// Products
app.get('/api/products', authenticateToken, async (req: any, res) => {
  const { role } = req.user;
  const store_id = req.user.store_id || null;
  let products;
  
  try {
    if (role === 'superadmin') {
      products = await db.prepare('SELECT p.*, s.name as store_name FROM products p LEFT JOIN stores s ON p.store_id = s.id').all();
    } else {
      products = await db.prepare('SELECT * FROM products WHERE store_id = ?').all(store_id);
    }
    
    if (!products) products = [];
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authenticateToken, async (req: any, res) => {
  const { name, description, category, weight, unit, stock_quantity, image, store_id } = req.body;
  const userStoreId = req.user.role === 'superadmin' ? (store_id || 1) : req.user.store_id;

  try {
    const info = await db.prepare(`
      INSERT INTO products (name, description, category, weight, unit, stock_quantity, image, store_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, category, weight, unit, stock_quantity || 0, image, userStoreId);
    
    // @ts-ignore
    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { name, description, category, weight, unit, stock_quantity, image } = req.body;
  const userId = req.user.id;
  
  try {
    const currentProduct = await db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(id) as any;
    
    if (!currentProduct) return res.status(404).json({ error: 'Produto não encontrado' });

    await db.transaction(async () => {
      // Check for stock change and record movement
      if (stock_quantity !== undefined && stock_quantity !== currentProduct.stock_quantity) {
        const diff = stock_quantity - currentProduct.stock_quantity;
        const type = diff > 0 ? 'in' : 'out';
        const quantity = Math.abs(diff);
        
        await db.prepare(`
          INSERT INTO movements (product_id, type, quantity, user_id, observation)
          VALUES (?, ?, ?, ?, 'Ajuste manual na edição do produto')
        `).run(id, type, quantity, userId);
      }

      await db.prepare(`
        UPDATE products 
        SET name = ?, description = ?, category = ?, weight = ?, unit = ?, stock_quantity = ?, image = ?
        WHERE id = ?
      `).run(name, description, category, weight, unit, stock_quantity, image, id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// Movements (Stock In/Out)
app.post('/api/movements', authenticateToken, async (req: any, res) => {
  const { product_id, type, quantity, observation, client_name, client_contact, payment_status, payment_due_date } = req.body;
  const user_id = req.user.id;

  try {
    const product = await db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(product_id) as any;
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    if (type === 'out' && product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Estoque insuficiente' });
    }

    const newQuantity = type === 'in' ? product.stock_quantity + quantity : product.stock_quantity - quantity;

    await db.transaction(async () => {
      await db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(newQuantity, product_id);
      await db.prepare(`
        INSERT INTO movements (product_id, type, quantity, user_id, observation, client_name, client_contact, payment_status, payment_due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, type, quantity, user_id, observation, client_name, client_contact, payment_status, payment_due_date);
    });

    res.json({ success: true, newQuantity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
});

// User Management
app.get('/api/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  
  try {
    const users = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.store_id, u.phone, s.name as store_name 
      FROM users u 
      LEFT JOIN stores s ON u.store_id = s.id
    `).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  
  const { name, email, password, role, store_id, phone } = req.body;
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.prepare(`
      INSERT INTO users (name, email, password, role, store_id, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, hashedPassword, role, store_id || null, phone);
    res.json({ success: true });
  } catch (error: any) {
    if (error.toString().includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/users/:id/reset-password', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });
  }

  try {
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Profile Management (Self)
app.put('/api/profile', authenticateToken, async (req: any, res) => {
  const { name, email, password, currentPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Validate current password if changing password
    if (password) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    }

    // Update info
    if (name || email) {
      await db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name || user.name, email || user.email, userId);
    }

    res.json({ success: true });
  } catch (error: any) {
    if (error.toString().includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Production / Split
app.post('/api/movements/production', authenticateToken, async (req: any, res) => {
  const { source_product_id, target_product_id, quantity_produced, quantity_consumed } = req.body;
  const { id: user_id } = req.user;

  if (!source_product_id || !target_product_id || !quantity_produced || !quantity_consumed) {
    return res.status(400).json({ error: 'Dados incompletos para produção' });
  }

  try {
    // Start transaction logic (manual in SQLite without explicit transaction block in this lib, but sequential)
    // 1. Check source stock
    const source = await db.prepare('SELECT * FROM products WHERE id = ?').get(source_product_id) as any;
    if (!source) return res.status(404).json({ error: 'Produto origem não encontrado' });
    
    if (source.stock_quantity < quantity_consumed) {
      return res.status(400).json({ error: `Estoque insuficiente na origem. Disponível: ${source.stock_quantity}` });
    }

    // 2. Decrement Source
    await db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(quantity_consumed, source_product_id);
    
    // 3. Increment Target
    await db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(quantity_produced, target_product_id);

    // 4. Register OUT movement for Source
    await db.prepare(`
      INSERT INTO movements (product_id, type, quantity, user_id, observation, timestamp)
      VALUES (?, 'out', ?, ?, ?, datetime('now'))
    `).run(source_product_id, quantity_consumed, user_id, `Produção: Usado para criar produto #${target_product_id}`);

    // 5. Register IN movement for Target
    await db.prepare(`
      INSERT INTO movements (product_id, type, quantity, user_id, observation, timestamp)
      VALUES (?, 'in', ?, ?, ?, datetime('now'))
    `).run(target_product_id, quantity_produced, user_id, `Produção: Criado a partir do produto #${source_product_id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Production error:', error);
    res.status(500).json({ error: 'Erro ao registrar produção' });
  }
});

// Stores
app.get('/api/stores', authenticateToken, async (req: any, res) => {
  try {
    const stores = await db.prepare('SELECT * FROM stores').all();
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lojas' });
  }
});

app.post('/api/stores', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
  const { name, location } = req.body;
  try {
    await db.prepare('INSERT INTO stores (name, location) VALUES (?, ?)').run(name, location);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar loja' });
  }
});

// Temporary schema check
app.get('/api/debug/schema', async (req, res) => {
  try {
    const tableInfo = await db.prepare("PRAGMA table_info(users)").all();
    res.json(tableInfo);
  } catch (error) {
    res.status(500).json({ error: 'Error checking schema', details: error });
  }
});

// Production: Serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Development: Vite middleware
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  };
  startVite();
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
