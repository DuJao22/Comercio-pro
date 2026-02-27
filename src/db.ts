import { Database } from '@sqlitecloud/drivers';
import bcrypt from 'bcryptjs';

const connectionString = 'sqlitecloud://cmq6frwshz.g4.sqlite.cloud:8860/Comerciopro.db?apikey=Dor8OwUECYmrbcS5vWfsdGpjCpdm9ecSDJtywgvRw8k';

class DatabaseWrapper {
  private client: Database;

  constructor(connString: string) {
    this.client = new Database(connString);
  }

  prepare(sql: string) {
    return {
      get: async (...args: any[]) => {
        const result = await this.client.sql(sql, ...args);
        return Array.isArray(result) ? result[0] : null;
      },
      all: async (...args: any[]) => {
        const result = await this.client.sql(sql, ...args);
        return Array.isArray(result) ? result : [];
      },
      run: async (...args: any[]) => {
        const result = await this.client.sql(sql, ...args);
        // SQLite Cloud returns different metadata depending on the query
        // We try to mimic better-sqlite3 info object (lastInsertRowid, changes)
        return { 
          lastInsertRowid: result.lastID || result.lastInsertRowid || 0, 
          changes: result.changes || 0 
        };
      }
    };
  }

  async transaction(callback: () => Promise<void>) {
    try {
      await this.client.sql('BEGIN TRANSACTION');
      await callback();
      await this.client.sql('COMMIT');
    } catch (error) {
      await this.client.sql('ROLLBACK');
      throw error;
    }
  }
  
  // Direct SQL execution if needed
  async sql(sql: string, ...args: any[]) {
    return await this.client.sql(sql, ...args);
  }
}

const db = new DatabaseWrapper(connectionString);

export async function initDb() {
  // Create tables
  // Note: SQLite Cloud might already have them if persistent, but IF NOT EXISTS handles it.
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin')),
      store_id INTEGER,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    )`,

    `CREATE TABLE IF NOT EXISTS products (
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
    )`,

    `CREATE TABLE IF NOT EXISTS movements (
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
    )`,

    `CREATE TABLE IF NOT EXISTS requests (
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
    )`,

    `CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      destination_store_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'received')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (destination_store_id) REFERENCES stores(id)
    )`
  ];

  for (const query of queries) {
    await db.sql(query);
  }

  // Seed initial data if empty
  const userCountResult = await db.prepare('SELECT count(*) as count FROM users').get();
  const userCount = userCountResult ? (userCountResult as any).count : 0;
  
  if (userCount === 0) {
    console.log('Seeding database...');
    
    // Create default store
    const storeResult = await db.prepare('INSERT INTO stores (name, location) VALUES (?, ?)').run('Loja Matriz', 'Centro');
    // @ts-ignore
    const storeId = storeResult.lastInsertRowid;

    // Create Superadmin
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await db.prepare('INSERT INTO users (name, email, password, role, store_id) VALUES (?, ?, ?, ?, ?)').run(
      'Super Admin',
      'admin@sistema.com',
      hashedPassword,
      'superadmin',
      null
    );

    // Create Store Admin
    const adminPassword = bcrypt.hashSync('loja123', 10);
    await db.prepare('INSERT INTO users (name, email, password, role, store_id) VALUES (?, ?, ?, ?, ?)').run(
      'Gerente Loja 1',
      'gerente@loja1.com',
      adminPassword,
      'admin',
      storeId
    );

    console.log('Database seeded!');
  }
}

export default db;
