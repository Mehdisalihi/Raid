import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'database_service.dart';

final String _baseUrl = (kIsWeb ||
        defaultTargetPlatform == TargetPlatform.windows ||
        defaultTargetPlatform == TargetPlatform.linux ||
        defaultTargetPlatform == TargetPlatform.macOS)
    ? 'http://localhost:5001/v1'
    : 'http://10.0.2.2:5001/v1';

class ApiService {
  static const _timeout = Duration(seconds: 15); // Slightly shorter timeout for better UX

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
      rethrow; // Re-throw to be handled by the specific service (fallback to DB)
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
      rethrow;
    }
  }

  static Future<void> delete(String path) async {
    try {
      final res = await http
          .delete(Uri.parse('$_baseUrl$path'), headers: await _headers())
          .timeout(_timeout);
      _check(res);
    } catch (e) {
      if (kDebugMode) print('API DELETE Error ($path): $e');
      rethrow;
    }
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
    
    // Sync offline records
    await SyncService.syncPending();
    
    notify();
  }

  static Future<String?> getLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('last_sync');
  }
}

class AuthService {
  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final res = await ApiService.post(
        '/auth/login', {'email': email, 'password': password});
    return res as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> register(
      String name, String email, String password) async {
    final res = await ApiService.post(
        '/auth/register', {'name': name, 'email': email, 'password': password});
    return res as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await ApiService.get('/auth/me');
    return res as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> data) async {
    final res = await ApiService.put('/auth/settings', data);
    return res as Map<String, dynamic>;
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
    final res = await ApiService.post('/products', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/products/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/products/$id');
    DataSync.notify();
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
    final res = await ApiService.post('/customers', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/customers/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/customers/$id');
    DataSync.notify();
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
    final res = await ApiService.post('/suppliers', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/suppliers/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/suppliers/$id');
    DataSync.notify();
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
    
    if (toSync.isNotEmpty) {
      DataSync.notify();
    }
  }
}

class ExpenseService {
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/expenses')) as List;
  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/expenses', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/expenses/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/expenses/$id');
    DataSync.notify();
  }

  static Future<List<dynamic>> getCategories() async =>
      (await ApiService.get('/expenses/categories')) as List;
}

class ReportService {
  static Future<Map<String, dynamic>> getStats() async =>
      (await ApiService.get('/reports/stats')) as Map<String, dynamic>;
  static Future<List<dynamic>> getActivities() async =>
      (await ApiService.get('/reports/activities')) as List;
  static Future<List<dynamic>> getCharts() async =>
      (await ApiService.get('/reports/charts')) as List;
  static Future<List<dynamic>> getTopProducts() async =>
      (await ApiService.get('/reports/top-products')) as List;
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
    await ApiService.delete('/purchases/$id');
    DataSync.notify();
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/invoices/$id', data);
    DataSync.notify();
    return res;
  }
}

class ReturnService {
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/returns')) as List;
  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/returns', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/returns/$id');
    DataSync.notify();
  }
}

class DebtService {
  static Future<List<dynamic>> getDebtors() async =>
      (await ApiService.get('/debts/debtors')) as List;
  static Future<List<dynamic>> getCreditors() async =>
      (await ApiService.get('/debts/creditors')) as List;
  static Future<dynamic> recordPayment(dynamic id, double amount) async {
    final res = await ApiService.post('/debts/$id/pay', {'amount': amount});
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/debts/$id');
    DataSync.notify();
  }
}

class UserService {
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/users')) as List;

  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/users', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/users/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/users/$id');
    DataSync.notify();
  }
}

class WarehouseService {
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/warehouses')) as List;

  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/warehouses', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> update(dynamic id, Map<String, dynamic> data) async {
    final res = await ApiService.put('/warehouses/$id', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/warehouses/$id');
    DataSync.notify();
  }
}

class InventoryService {
  static Future<List<dynamic>> getMovements() async =>
      (await ApiService.get('/inventory/movements')) as List;

  static Future<List<dynamic>> getByWarehouse(dynamic warehouseId) async =>
      (await ApiService.get('/inventory/warehouses/$warehouseId')) as List;

  static Future<dynamic> transfer(Map<String, dynamic> data) async {
    final res = await ApiService.post('/inventory/transfer', data);
    DataSync.notify();
    return res;
  }

  static Future<dynamic> addStock(Map<String, dynamic> data) async {
    final res = await ApiService.post('/inventory/add', data);
    DataSync.notify();
    return res;
  }
}

