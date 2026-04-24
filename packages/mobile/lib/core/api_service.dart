import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

final String _baseUrl = (kIsWeb ||
        defaultTargetPlatform == TargetPlatform.windows ||
        defaultTargetPlatform == TargetPlatform.linux ||
        defaultTargetPlatform == TargetPlatform.macOS)
    ? 'http://localhost:5000/v1'
    : 'http://10.0.2.2:5000/v1'; // غير هذا الآي بي لعنوان جهازك (مثل http://192.168.1.5:5000/v1) إذا كنت على هاتف حقيقي

class ApiService {
  static const _timeout = Duration(seconds: 30);

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
    final res = await http
        .get(Uri.parse('$_baseUrl$path'), headers: await _headers())
        .timeout(_timeout);
    _check(res);
    return jsonDecode(res.body);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http
        .post(Uri.parse('$_baseUrl$path'),
            headers: await _headers(), body: jsonEncode(body))
        .timeout(_timeout);
    _check(res);
    return jsonDecode(res.body);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final res = await http
        .put(Uri.parse('$_baseUrl$path'),
            headers: await _headers(), body: jsonEncode(body))
        .timeout(_timeout);
    _check(res);
    return jsonDecode(res.body);
  }

  static Future<void> delete(String path) async {
    final res = await http
        .delete(Uri.parse('$_baseUrl$path'), headers: await _headers())
        .timeout(_timeout);
    _check(res);
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
    // This app's screens listen to DataSync.notifier and refetch on change.
    // Calling notify() triggers all active screens to refresh.
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_sync', DateTime.now().toIso8601String());
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
}

class ProductService {
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/products')) as List;
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
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/customers')) as List;
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
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/suppliers')) as List;
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
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/sales')) as List;
  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/sales', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/sales/$id');
    DataSync.notify();
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
  static Future<List<dynamic>> getAll() async =>
      (await ApiService.get('/purchases')) as List;
  static Future<dynamic> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/purchases', data);
    DataSync.notify();
    return res;
  }

  static Future<void> delete(dynamic id) async {
    await ApiService.delete('/purchases/$id');
    DataSync.notify();
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

