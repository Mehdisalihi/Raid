import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;

  factory DatabaseService() => _instance;

  DatabaseService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'mohassibe_local.db');
    return await openDatabase(
      path,
      version: 2, // Upgraded to v2 for offline-first support
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await _createV2Tables(db);
    }
  }

  Future _onCreate(Database db, int version) async {
    await _createV1Tables(db);
    if (version >= 2) {
      await _createV2Tables(db);
    }
  }

  Future _createV1Tables(Database db) async {
    // Products Table
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT,
        buyPrice REAL,
        sellPrice REAL,
        stockQty INTEGER,
        minStockAlert INTEGER,
        createdAt TEXT
      )
    ''');

    // Customers Table
    await db.execute('''
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        balance REAL,
        createdAt TEXT
      )
    ''');

    // Suppliers Table
    await db.execute('''
      CREATE TABLE suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        balance REAL,
        createdAt TEXT
      )
    ''');

    // Invoices Table
    await db.execute('''
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        invoiceNo TEXT NOT NULL,
        customerId TEXT,
        supplierId TEXT,
        totalAmount REAL,
        discount REAL,
        taxRate REAL,
        taxAmount REAL,
        finalAmount REAL,
        type TEXT,
        isDebt INTEGER,
        paymentMethod TEXT,
        createdAt TEXT,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // Invoice Items Table
    await db.execute('''
      CREATE TABLE invoice_items (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        productId TEXT NOT NULL,
        qty INTEGER,
        price REAL,
        total REAL,
        FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
      )
    ''');
  }

  Future _createV2Tables(Database db) async {
    // Expenses Table
    await db.execute('''
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        description TEXT,
        amount REAL,
        categoryId TEXT,
        date TEXT,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // Expense Categories Table
    await db.execute('''
      CREATE TABLE expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    ''');

    // Returns Table
    await db.execute('''
      CREATE TABLE returns (
        id TEXT PRIMARY KEY,
        saleId TEXT,
        total REAL,
        date TEXT,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // Return Items Table
    await db.execute('''
      CREATE TABLE return_items (
        id TEXT PRIMARY KEY,
        returnId TEXT NOT NULL,
        productId TEXT NOT NULL,
        quantity INTEGER,
        price REAL,
        FOREIGN KEY (returnId) REFERENCES returns (id) ON DELETE CASCADE
      )
    ''');

    // Debts Table
    await db.execute('''
      CREATE TABLE debts (
        id TEXT PRIMARY KEY,
        entityId TEXT,
        entityType TEXT, -- 'customer' or 'supplier'
        amount REAL,
        remaining REAL,
        type TEXT,
        invoiceId TEXT,
        date TEXT,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // Warehouses Table
    await db.execute('''
      CREATE TABLE warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        isSynced INTEGER DEFAULT 0
      )
    ''');

    // Local Users Table (for offline auth)
    await db.execute('''
      CREATE TABLE local_users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        passwordHash TEXT,
        role TEXT,
        storeName TEXT
      )
    ''');

    // Pending Sync Table (Generic queue for offline actions)
    await db.execute('''
      CREATE TABLE pending_sync (
        id TEXT PRIMARY KEY,
        tableName TEXT,
        operation TEXT, -- 'INSERT', 'UPDATE', 'DELETE'
        data TEXT, -- JSON payload
        createdAt TEXT
      )
    ''');
  }

  // Generic Helper Methods
  Future<int> insert(String table, Map<String, dynamic> data) async {
    final db = await database;
    return await db.insert(table, data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> queryAll(String table) async {
    final db = await database;
    return await db.query(table);
  }

  Future<int> update(String table, Map<String, dynamic> data) async {
    final db = await database;
    return await db.update(table, data, where: 'id = ?', whereArgs: [data['id']]);
  }

  Future<int> delete(String table, String id) async {
    final db = await database;
    return await db.delete(table, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> clearTable(String table) async {
    final db = await database;
    await db.delete(table);
  }
}
