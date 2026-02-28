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
initDb().catch(console.error);

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
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

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
  const { role, store_id } = req.user;
  
  try {
    let stats: any = {};

    if (role === 'superadmin') {
      stats.totalStores = (await db.prepare('SELECT count(*) as count FROM stores').get() as any).count;
      stats.totalProducts = (await db.prepare('SELECT count(*) as count FROM products').get() as any).count;
      stats.totalMovements = (await db.prepare('SELECT count(*) as count FROM movements').get() as any).count;
      
      // Recent movements global
      stats.recentMovements = await db.prepare(`
        SELECT m.*, p.name as product_name, u.name as user_name 
        FROM movements m 
        JOIN products p ON m.product_id = p.id 
        JOIN users u ON m.user_id = u.id 
        ORDER BY m.timestamp DESC LIMIT 5
      `).all();

      // Sales by day global
      stats.salesByDay = await db.prepare(`
        SELECT strftime('%Y-%m-%d', timestamp) as date, SUM(quantity) as total
        FROM movements
        WHERE type = 'out'
        GROUP BY date
        ORDER BY date ASC
        LIMIT 7
      `).all();

      // Financial Report (Movements)
      const today = new Date().toISOString().split('T')[0];
      
      stats.financial = {
        paid: await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'paid' AND m.type = 'out'
          ORDER BY m.timestamp DESC LIMIT 10
        `).all(),
        pending: await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'pending' AND m.type = 'out' AND (m.payment_due_date >= ? OR m.payment_due_date IS NULL)
          ORDER BY m.payment_due_date ASC LIMIT 10
        `).all(today),
        overdue: await db.prepare(`
          SELECT m.*, s.name as store_name, p.name as product_name 
          FROM movements m 
          JOIN products p ON m.product_id = p.id 
          JOIN stores s ON p.store_id = s.id 
          WHERE m.payment_status = 'pending' AND m.type = 'out' AND m.payment_due_date < ?
          ORDER BY m.payment_due_date ASC
        `).all(today)
      };

    } else {
      // Admin (Store specific)
      stats.totalProducts = (await db.prepare('SELECT count(*) as count FROM products WHERE store_id = ?').get(store_id) as any).count;
      stats.totalMovements = (await db.prepare(`
        SELECT count(*) as count FROM movements m 
        JOIN products p ON m.product_id = p.id 
        WHERE p.store_id = ?
      `).get(store_id) as any).count;

      // Sales by day store
      stats.salesByDay = await db.prepare(`
        SELECT strftime('%Y-%m-%d', m.timestamp) as date, SUM(m.quantity) as total
        FROM movements m
        JOIN products p ON m.product_id = p.id
        WHERE m.type = 'out' AND p.store_id = ?
        GROUP BY date
        ORDER BY date ASC
        LIMIT 7
      `).all(store_id);

      // Recent movements store
      stats.recentMovements = await db.prepare(`
        SELECT m.*, p.name as product_name, u.name as user_name 
        FROM movements m 
        JOIN products p ON m.product_id = p.id 
        JOIN users u ON m.user_id = u.id 
        WHERE p.store_id = ?
        ORDER BY m.timestamp DESC LIMIT 5
      `).all(store_id);

      // Low stock store
      stats.lowStock = await db.prepare('SELECT * FROM products WHERE store_id = ? AND stock_quantity < 10').all(store_id);
    }

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// Products
app.get('/api/products', authenticateToken, async (req: any, res) => {
  const { role, store_id } = req.user;
  let products;
  
  try {
    if (role === 'superadmin') {
      products = await db.prepare('SELECT p.*, s.name as store_name FROM products p LEFT JOIN stores s ON p.store_id = s.id').all();
    } else {
      products = await db.prepare('SELECT * FROM products WHERE store_id = ?').all(store_id);
    }
    res.json(products);
  } catch (error) {
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
      SELECT u.id, u.name, u.email, u.role, u.store_id, s.name as store_name 
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
  
  const { name, email, password, role, store_id } = req.body;
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.prepare(`
      INSERT INTO users (name, email, password, role, store_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, hashedPassword, role, store_id || null);
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
