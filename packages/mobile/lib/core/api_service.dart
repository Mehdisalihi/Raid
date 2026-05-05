import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'database_service.dart';

const String _baseUrl = 'https://backend-dedamed222s-projects.vercel.app/v1';

class ApiService {
  static const _timeout = Duration(seconds: 15);

  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String path) async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl$path'), headers: await _headers())
          .timeout(_timeout);
      _check(res);
      return jsonDecode(res.body);
    } catch (e) {
      if (kDebugMode) print('API GET Error ($path): $e');
      rethrow;
    }
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    try {
      final res = await http
          .post(Uri.parse('$_baseUrl$path'),
              headers: await _headers(), body: jsonEncode(body))
          .timeout(_timeout);
      _check(res);
      return jsonDecode(res.body);
    } catch (e) {
      if (kDebugMode) print('API POST Error ($path): $e');
      if (e is SocketException || e is TimeoutException || e.toString().contains('Network')) {
        return await _handleOfflineWrite('INSERT', path, body);
      }
      rethrow;
    }
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    try {
      final res = await http
          .put(Uri.parse('$_baseUrl$path'),
              headers: await _headers(), body: jsonEncode(body))
          .timeout(_timeout);
      _check(res);
      return jsonDecode(res.body);
    } catch (e) {
      if (kDebugMode) print('API PUT Error ($path): $e');
      if (e is SocketException || e is TimeoutException || e.toString().contains('Network')) {
        return await _handleOfflineWrite('UPDATE', path, body);
      }
      rethrow;
    }
  }

  static Future<dynamic> delete(String path) async {
    try {
      final res = await http
          .delete(Uri.parse('$_baseUrl$path'), headers: await _headers())
          .timeout(_timeout);
      _check(res);
      return {'success': true};
    } catch (e) {
      if (kDebugMode) print('API DELETE Error ($path): $e');
      if (e is SocketException || e is TimeoutException || e.toString().contains('Network')) {
        return await _handleOfflineWrite('DELETE', path, null);
      }
      rethrow;
    }
  }

  static Future<dynamic> _handleOfflineWrite(String method, String path, Map<String, dynamic>? body) async {
    final db = DatabaseService();
    final id = 'local_sync_${DateTime.now().millisecondsSinceEpoch}';
    
    final segments = path.split('/').where((s) => s.isNotEmpty).toList();
    final resource = segments.isNotEmpty ? segments[0] : 'unknown';

    await db.insert('pending_sync', {
      'id': id,
      'tableName': resource,
      'operation': method,
      'data': jsonEncode(body ?? {}),
      'createdAt': DateTime.now().toIso8601String(),
    });
    
    return {'id': id, 'offline': true};
  }

  static void _check(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String msg = 'خطأ في الاتصال: ${res.statusCode}';
      try {
        final body = jsonDecode(res.body);
        if (body['error'] != null) msg = body['error'];
      } catch (_) {}
      throw Exception(msg);
    }
  }
}

class DataSync {
  static final ValueNotifier<int> notifier = ValueNotifier(0);
  static void notify() => notifier.value++;

  static Future<void> syncAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_sync', DateTime.now().toIso8601String());
    
    await SyncService.syncPending();
    notify();
  }

  static Future<String?> getLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('last_sync');
  }
}

class AuthService {
  static final _db = DatabaseService();

  static String _hashPassword(String password) {
    // Simple encoding for local offline check since crypto is not in pubspec
    return base64Encode(utf8.encode(password));
  }

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    try {
      final res = await ApiService.post(
          '/auth/login', {'email': email, 'password': password});
      
      // Save to local users table for future offline login
      try {
        final user = res['user'];
        await _db.insert('local_users', {
          'id': user['id'],
          'name': user['name'],
          'email': user['email'],
          'passwordHash': _hashPassword(password),
          'role': user['role'],
          'storeName': user['storeName'],
        });
      } catch (e) {
        if (kDebugMode) print('Failed to save local user: $e');
      }

      return res as Map<String, dynamic>;
    } catch (e) {
      if (kDebugMode) print('Falling back to local login...');
      // Check local DB
      final users = await _db.queryAll('local_users');
      final hashedPass = _hashPassword(password);
      
      try {
        final localUser = users.firstWhere(
            (u) => u['email'] == email && u['passwordHash'] == hashedPass);
        
        return {
          'token': 'offline_token_${localUser['id']}',
          'user': {
            'id': localUser['id'],
            'name': localUser['name'],
            'email': localUser['email'],
            'role': localUser['role'],
            'storeName': localUser['storeName'],
          }
        };
      } catch (_) {
        throw Exception('البريد الإلكتروني أو كلمة المرور غير صحيحة (أوفلاين)');
      }
    }
  }

  static Future<Map<String, dynamic>> register(
      String name, String email, String password) async {
    final res = await ApiService.post(
        '/auth/register', {'name': name, 'email': email, 'password': password});
        
    try {
      final user = res['user'];
      await _db.insert('local_users', {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'passwordHash': _hashPassword(password),
        'role': user['role'],
        'storeName': user['storeName'],
      });
    } catch (e) {
      if (kDebugMode) print('Failed to save local user: $e');
    }

    return res as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    try {
      final res = await ApiService.get('/auth/me');
      return res as Map<String, dynamic>;
    } catch (e) {
      // If offline, just throw, auth_provider handles it by not updating
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/auth/settings', data);
      return res as Map<String, dynamic>;
    } catch (e) {
      throw Exception('لا يمكن تحديث الإعدادات بدون إنترنت');
    }
  }
}

class ProductService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final products = (await ApiService.get('/products')) as List;
      // Update local cache
      for (var p in products) {
        await _db.insert('products', {
          'id': p['id'],
          'name': p['name'],
          'barcode': p['barcode'],
          'buyPrice': (p['buyPrice'] ?? 0.0).toDouble(),
          'sellPrice': (p['sellPrice'] ?? 0.0).toDouble(),
          'stockQty': p['stockQty'] ?? 0,
          'minStockAlert': p['minStockAlert'] ?? 5,
          'createdAt': p['createdAt'],
        });
      }
      return products;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Products DB...');
      return await _db.queryAll('products');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/products', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Product to local DB...');
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('products', {
        'id': id,
        'name': data['name'],
        'barcode': data['barcode'],
        'buyPrice': (data['buyPrice'] ?? 0.0).toDouble(),
        'sellPrice': (data['sellPrice'] ?? 0.0).toDouble(),
        'stockQty': data['stockQty'] ?? 0,
        'minStockAlert': data['minStockAlert'] ?? 5,
        'createdAt': DateTime.now().toIso8601String(),
      });
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'products',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/products/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Updating Product locally...');
      await _db.update('products', {'id': id, ...data});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'products',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/products/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'products',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('products', id as String);
      DataSync.notify();
    }
  }
}

class CustomerService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final customers = (await ApiService.get('/customers')) as List;
      for (var c in customers) {
        await _db.insert('customers', {
          'id': c['id'],
          'name': c['name'],
          'phone': c['phone'],
          'email': c['email'],
          'balance': (c['balance'] ?? 0.0).toDouble(),
          'createdAt': c['createdAt'],
        });
      }
      return customers;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Customers DB...');
      return await _db.queryAll('customers');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/customers', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Customer to local DB...');
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('customers', {
        'id': id,
        'name': data['name'],
        'phone': data['phone'],
        'email': data['email'],
        'balance': 0.0,
        'createdAt': DateTime.now().toIso8601String(),
      });
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'customers',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/customers/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Updating Customer locally...');
      await _db.update('customers', {'id': id, ...data});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'customers',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/customers/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'customers',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('customers', id as String);
      DataSync.notify();
    }
  }

  static Future<Map<String, dynamic>> getStatement(dynamic id) async =>
      (await ApiService.get('/customers/$id/statement')) as Map<String, dynamic>;
}

class SupplierService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final suppliers = (await ApiService.get('/suppliers')) as List;
      for (var s in suppliers) {
        await _db.insert('suppliers', {
          'id': s['id'],
          'name': s['name'],
          'phone': s['phone'],
          'email': s['email'],
          'balance': (s['balance'] ?? 0.0).toDouble(),
          'createdAt': s['createdAt'],
        });
      }
      return suppliers;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Suppliers DB...');
      return await _db.queryAll('suppliers');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/suppliers', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Supplier to local DB...');
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('suppliers', {
        'id': id,
        'name': data['name'],
        'phone': data['phone'],
        'email': data['email'],
        'balance': 0.0,
        'createdAt': DateTime.now().toIso8601String(),
      });
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'suppliers',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/suppliers/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Updating Supplier locally...');
      await _db.update('suppliers', {'id': id, ...data});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'suppliers',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/suppliers/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'suppliers',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('suppliers', id as String);
      DataSync.notify();
    }
  }

  static Future<Map<String, dynamic>> getStatement(dynamic id) async =>
      (await ApiService.get('/suppliers/$id/statement')) as Map<String, dynamic>;
}

class SaleService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll({String? date, String? paymentMethod}) async {
    try {
      String path = '/sales';
      List<String> params = [];
      if (date != null) params.add('date=$date');
      if (paymentMethod != null && paymentMethod != 'all') {
        params.add('paymentMethod=$paymentMethod');
      }
      if (params.isNotEmpty) path += '?${params.join('&')}';

      final sales = (await ApiService.get(path)) as List;
      for (var s in sales) {
        await _db.insert('invoices', {
          'id': s['id'],
          'invoiceNo': s['invoiceNo'],
          'customerId': s['customerId'],
          'supplierId': s['supplierId'],
          'totalAmount': (s['totalAmount'] ?? 0.0).toDouble(),
          'discount': (s['discount'] ?? 0.0).toDouble(),
          'taxRate': (s['taxRate'] ?? 0.0).toDouble(),
          'taxAmount': (s['taxAmount'] ?? 0.0).toDouble(),
          'finalAmount': (s['finalAmount'] ?? 0.0).toDouble(),
          'type': s['type'],
          'isDebt': (s['isDebt'] == true) ? 1 : 0,
          'paymentMethod': s['paymentMethod'],
          'createdAt': s['createdAt'],
          'isSynced': 1,
        });
      }
      return sales;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Sales DB...');
      return await _db.queryAll('invoices');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/sales', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Sale to local DB...');
      // Generate a temporary ID and save to local DB
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      final invoiceData = Map<String, dynamic>.from(data);
      invoiceData['id'] = id;
      invoiceData['isSynced'] = 0;
      invoiceData['createdAt'] = DateTime.now().toIso8601String();
      
      await _db.insert('invoices', {
        'id': id,
        'invoiceNo': data['invoiceNo'] ?? 'PENDING',
        'customerId': data['customerId'],
        'totalAmount': data['totalAmount'],
        'finalAmount': data['finalAmount'],
        'type': 'SALE',
        'isSynced': 0,
        'createdAt': invoiceData['createdAt'],
      });
      
      // Save items too
      if (data['items'] != null) {
        for (var item in data['items']) {
          await _db.insert('invoice_items', {
            'id': 'item_${DateTime.now().microsecondsSinceEpoch}',
            'invoiceId': id,
            'productId': item['productId'],
            'qty': item['qty'],
            'price': item['price'],
            'total': item['total'],
          });
        }
      }
      
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/sales/$id');
    DataSync.notify();
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/invoices/$id', data);
    DataSync.notify();
    return res;
  }
}

class SyncService {
  static final _db = DatabaseService();

  static Future<void> syncPending() async {
    // 1. Sync Invoices (Legacy offline logic, retaining for compatibility)
    final pending = await _db.queryAll('invoices');
    final toSync = pending.where((i) => i['isSynced'] == 0).toList();
    
    if (kDebugMode) print('Found ${toSync.length} pending invoices to sync.');
    
    for (var inv in toSync) {
      try {
        final items = (await _db.queryAll('invoice_items'))
            .where((it) => it['invoiceId'] == inv['id'])
            .toList();
            
        final syncData = {
          'customerId': inv['customerId'],
          'supplierId': inv['supplierId'],
          'totalAmount': inv['totalAmount'],
          'finalAmount': inv['finalAmount'],
          'type': inv['type'],
          'paymentMethod': inv['paymentMethod'] ?? 'cash',
          'items': items.map((it) => {
            'productId': it['productId'],
            'qty': it['qty'],
            'price': it['price'],
            'total': it['total'],
          }).toList(),
        };
        
        if (inv['type'] == 'SALE') {
          await ApiService.post('/sales', syncData);
        } else if (inv['type'] == 'PURCHASE') {
          await ApiService.post('/purchases', syncData);
        }
        
        await _db.delete('invoices', inv['id'] as String);
      } catch (e) {
        if (kDebugMode) print('Failed to sync invoice ${inv['id']}: $e');
      }
    }
    
    // 2. Sync generic pending queue (Expenses, Returns, Debts, Users, Warehouses)
    final pendingQueue = await _db.queryAll('pending_sync');
    if (kDebugMode) print('Found ${pendingQueue.length} pending queue items to sync.');

    for (var item in pendingQueue) {
      try {
        final tableName = item['tableName'] as String;
        final operation = item['operation'] as String;
        final dataStr = item['data'] as String;
        final id = item['id'] as String;
        
        final Map<String, dynamic> data = jsonDecode(dataStr);
        final recordId = data['id'];
        // Remove temporary local ID prefix if present to let backend generate its own
        if (recordId != null && recordId.toString().startsWith('local_')) {
          data.remove('id');
        }

        switch (tableName) {
          case 'products':
            if (operation == 'INSERT') await ApiService.post('/products', data);
            if (operation == 'UPDATE') await ApiService.put('/products/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/products/$recordId');
            break;
          case 'customers':
            if (operation == 'INSERT') await ApiService.post('/customers', data);
            if (operation == 'UPDATE') await ApiService.put('/customers/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/customers/$recordId');
            break;
          case 'suppliers':
            if (operation == 'INSERT') await ApiService.post('/suppliers', data);
            if (operation == 'UPDATE') await ApiService.put('/suppliers/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/suppliers/$recordId');
            break;
          case 'purchases':
            if (operation == 'INSERT') await ApiService.post('/purchases', data);
            if (operation == 'UPDATE') await ApiService.put('/invoices/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/purchases/$recordId');
            break;
          case 'expenses':
            if (operation == 'INSERT') await ApiService.post('/expenses', data);
            if (operation == 'UPDATE') await ApiService.put('/expenses/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/expenses/$recordId');
            break;
          case 'returns':
            if (operation == 'INSERT') await ApiService.post('/returns', data);
            if (operation == 'DELETE') await ApiService.delete('/returns/$recordId');
            break;
          case 'debts':
            if (operation == 'PAY') await ApiService.post('/debts/$recordId/pay', {'amount': data['amount']});
            if (operation == 'DELETE') await ApiService.delete('/debts/$recordId');
            break;
          case 'users':
            if (operation == 'INSERT') await ApiService.post('/users', data);
            if (operation == 'UPDATE') await ApiService.put('/users/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/users/$recordId');
            break;
          case 'warehouses':
            if (operation == 'INSERT') await ApiService.post('/warehouses', data);
            if (operation == 'UPDATE') await ApiService.put('/warehouses/$recordId', data);
            if (operation == 'DELETE') await ApiService.delete('/warehouses/$recordId');
            break;
          case 'inventory_transfer':
            if (operation == 'INSERT') await ApiService.post('/inventory/transfer', data);
            break;
          case 'inventory_add':
            if (operation == 'INSERT') await ApiService.post('/inventory/add', data);
            break;
        }

        // Successfully synced, remove from pending queue
        await _db.delete('pending_sync', id);
        // We might also want to clean up local temporary records if they were inserts
        if (operation == 'INSERT' && recordId != null && recordId.toString().startsWith('local_')) {
            if (tableName != 'inventory_transfer' && tableName != 'inventory_add') {
               await _db.delete(tableName, recordId as String);
            }
        }
      } catch (e) {
        if (kDebugMode) print('Failed to sync queue item ${item['id']}: $e');
      }
    }

    if (toSync.isNotEmpty || pendingQueue.isNotEmpty) {
      DataSync.notify();
    }
  }
}

class ExpenseService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final expenses = (await ApiService.get('/expenses')) as List;
      for (var e in expenses) {
        await _db.insert('expenses', {
          'id': e['id'],
          'description': e['description'],
          'amount': (e['amount'] ?? 0.0).toDouble(),
          'categoryId': e['categoryId'],
          'date': e['date'],
          'isSynced': 1,
        });
      }
      return expenses;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Expenses DB...');
      return await _db.queryAll('expenses');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/expenses', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Expense to local DB...');
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('expenses', {
        'id': id,
        'description': data['description'],
        'amount': data['amount'],
        'categoryId': data['categoryId'],
        'date': data['date'] ?? DateTime.now().toIso8601String(),
        'isSynced': 0,
      });
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'expenses',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/expenses/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      await _db.update('expenses', {'id': id, ...data, 'isSynced': 0});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'expenses',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/expenses/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'expenses',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('expenses', id as String);
      DataSync.notify();
    }
  }

  static Future<List<dynamic>> getCategories() async {
    try {
      final cats = (await ApiService.get('/expenses/categories')) as List;
      for (var c in cats) {
        await _db.insert('expense_categories', {
          'id': c['id'],
          'name': c['name'],
        });
      }
      return cats;
    } catch (e) {
      return await _db.queryAll('expense_categories');
    }
  }
}

class ReportService {
  static final _db = DatabaseService();

  static Future<Map<String, dynamic>> getStats() async {
    try {
      return (await ApiService.get('/reports/stats')) as Map<String, dynamic>;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Stats...');
      final invoices = await _db.queryAll('invoices');
      final products = await _db.queryAll('products');
      
      double totalSales = 0;
      double totalPurchases = 0;
      for (var inv in invoices) {
        if (inv['type'] == 'SALE') totalSales += (inv['totalAmount'] ?? 0);
        if (inv['type'] == 'PURCHASE') totalPurchases += (inv['totalAmount'] ?? 0);
      }
      
      return {
        'totalSales': totalSales,
        'transactions': invoices.where((i) => i['type'] == 'SALE').length,
        'profit': totalSales - totalPurchases,
        'products': products.length,
        'lowStock': products.where((p) => (p['stockQty'] ?? 0) <= (p['minStockAlert'] ?? 5)).length,
      };
    }
  }

  static Future<List<dynamic>> getActivities() async {
    try {
      return (await ApiService.get('/reports/activities')) as List;
    } catch (e) {
      return []; // Return empty for now offline
    }
  }

  static Future<List<dynamic>> getCharts() async {
    try {
      return (await ApiService.get('/reports/charts')) as List;
    } catch (e) {
      return [];
    }
  }

  static Future<List<dynamic>> getTopProducts() async {
    try {
      return (await ApiService.get('/reports/top-products')) as List;
    } catch (e) {
      return [];
    }
  }
}

class PurchaseService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final purchases = (await ApiService.get('/purchases')) as List;
      return purchases;
    } catch (e) {
      return await _db.queryAll('invoices').then((list) => list.where((i) => i['type'] == 'PURCHASE').toList());
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/purchases', data);
      DataSync.notify();
      return res;
    } catch (e) {
      // Offline purchase creation...
      DataSync.notify();
      return {'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/purchases/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'purchases',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('invoices', id as String);
      DataSync.notify();
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/invoices/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      await _db.update('invoices', {'id': id, ...data, 'isSynced': 0});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'purchases',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }
}

class ReturnService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final returns = (await ApiService.get('/returns')) as List;
      for (var r in returns) {
        await _db.insert('returns', {
          'id': r['id'],
          'saleId': r['saleId'],
          'total': (r['total'] ?? 0.0).toDouble(),
          'date': r['date'],
          'isSynced': 1,
        });
      }
      return returns;
    } catch (e) {
      if (kDebugMode) print('Falling back to local Returns DB...');
      return await _db.queryAll('returns');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/returns', data);
      DataSync.notify();
      return res;
    } catch (e) {
      if (kDebugMode) print('Offline: Saving Return to local DB...');
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('returns', {
        'id': id,
        'saleId': data['saleId'],
        'total': data['total'],
        'date': data['date'] ?? DateTime.now().toIso8601String(),
        'isSynced': 0,
      });
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'returns',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/returns/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'returns',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('returns', id as String);
      DataSync.notify();
    }
  }
}

class DebtService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getDebtors() async {
    try {
      final debtors = (await ApiService.get('/debts/debtors')) as List;
      for (var d in debtors) {
        await _db.insert('debts', {
          'id': d['id'],
          'entityId': d['customerId'] ?? d['entityId'],
          'entityType': 'customer',
          'amount': (d['amount'] ?? 0.0).toDouble(),
          'remaining': (d['remaining'] ?? 0.0).toDouble(),
          'type': d['type'] ?? 'receivable',
          'date': d['date'],
          'isSynced': 1,
        });
      }
      return debtors;
    } catch (e) {
      return await _db.queryAll('debts').then((list) => list.where((d) => d['entityType'] == 'customer').toList());
    }
  }

  static Future<List<dynamic>> getCreditors() async {
    try {
      final creditors = (await ApiService.get('/debts/creditors')) as List;
      for (var c in creditors) {
        await _db.insert('debts', {
          'id': c['id'],
          'entityId': c['supplierId'] ?? c['entityId'],
          'entityType': 'supplier',
          'amount': (c['amount'] ?? 0.0).toDouble(),
          'remaining': (c['remaining'] ?? 0.0).toDouble(),
          'type': c['type'] ?? 'payable',
          'date': c['date'],
          'isSynced': 1,
        });
      }
      return creditors;
    } catch (e) {
      return await _db.queryAll('debts').then((list) => list.where((c) => c['entityType'] == 'supplier').toList());
    }
  }

  static Future<dynamic> recordPayment(dynamic id, double amount) async {
    try {
      final res = await ApiService.post('/debts/$id/pay', {'amount': amount});
      DataSync.notify();
      return res;
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'debts',
        'operation': 'PAY',
        'data': jsonEncode({'id': id, 'amount': amount}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/debts/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'debts',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('debts', id as String);
      DataSync.notify();
    }
  }
}

class UserService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final users = (await ApiService.get('/users')) as List;
      for (var u in users) {
        await _db.insert('local_users', {
          'id': u['id'],
          'name': u['name'],
          'email': u['email'],
          'role': u['role'],
        });
      }
      return users;
    } catch (e) {
      return await _db.queryAll('local_users');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/users', data);
      DataSync.notify();
      return res;
    } catch (e) {
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('local_users', {'id': id, ...data});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'users',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/users/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      await _db.update('local_users', {'id': id, ...data});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'users',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/users/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'users',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('local_users', id as String);
      DataSync.notify();
    }
  }
}

class WarehouseService {
  static final _db = DatabaseService();

  static Future<List<dynamic>> getAll() async {
    try {
      final wh = (await ApiService.get('/warehouses')) as List;
      for (var w in wh) {
        await _db.insert('warehouses', {
          'id': w['id'],
          'name': w['name'],
          'location': w['location'],
          'isSynced': 1,
        });
      }
      return wh;
    } catch (e) {
      return await _db.queryAll('warehouses');
    }
  }

  static Future<dynamic> create(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/warehouses', data);
      DataSync.notify();
      return res;
    } catch (e) {
      final id = 'local_${DateTime.now().millisecondsSinceEpoch}';
      await _db.insert('warehouses', {'id': id, ...data, 'isSynced': 0});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'warehouses',
        'operation': 'INSERT',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    try {
      final res = await ApiService.put('/warehouses/$id', data);
      DataSync.notify();
      return res;
    } catch (e) {
      await _db.update('warehouses', {'id': id, ...data, 'isSynced': 0});
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'warehouses',
        'operation': 'UPDATE',
        'data': jsonEncode({'id': id, ...data}),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'id': id, 'offline': true};
    }
  }

  static Future<void> delete(dynamic id) async {
    try {
      await ApiService.delete('/warehouses/$id');
    } catch (e) {
      await _db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'warehouses',
        'operation': 'DELETE',
        'data': jsonEncode({'id': id}),
        'createdAt': DateTime.now().toIso8601String(),
      });
    } finally {
      await _db.delete('warehouses', id as String);
      DataSync.notify();
    }
  }
}

class InventoryService {
  static Future<List<dynamic>> getMovements() async {
    try {
      return (await ApiService.get('/inventory/movements')) as List;
    } catch (e) {
      return [];
    }
  }

  static Future<List<dynamic>> getByWarehouse(dynamic warehouseId) async {
    try {
      return (await ApiService.get('/inventory/warehouses/$warehouseId')) as List;
    } catch (e) {
      return [];
    }
  }

  static Future<dynamic> transfer(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/inventory/transfer', data);
      DataSync.notify();
      return res;
    } catch (e) {
      final db = DatabaseService();
      await db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'inventory_transfer',
        'operation': 'INSERT',
        'data': jsonEncode(data),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'offline': true};
    }
  }

  static Future<dynamic> addStock(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.post('/inventory/add', data);
      DataSync.notify();
      return res;
    } catch (e) {
      final db = DatabaseService();
      await db.insert('pending_sync', {
        'id': 'sync_${DateTime.now().microsecondsSinceEpoch}',
        'tableName': 'inventory_add',
        'operation': 'INSERT',
        'data': jsonEncode(data),
        'createdAt': DateTime.now().toIso8601String(),
      });
      DataSync.notify();
      return {'offline': true};
    }
  }
}

