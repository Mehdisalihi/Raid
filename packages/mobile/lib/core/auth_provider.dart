import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _loading = true;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;

  AuthProvider() {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userJson = prefs.getString('user_json');
      if (token != null && userJson != null) {
        _user = Map<String, dynamic>.from(jsonDecode(userJson) as Map);
      }
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final data = await AuthService.login(email, password);
    final prefs = await SharedPreferences.getInstance();
    final token = data['token'] as String;
    final user = data['user'] as Map<String, dynamic>;
    await prefs.setString('token', token);
    await prefs.setString('user_json', jsonEncode(user));
    _user = user;
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    final data = await AuthService.register(name, email, password);
    final prefs = await SharedPreferences.getInstance();
    final token = data['token'] as String;
    final user = data['user'] as Map<String, dynamic>;
    await prefs.setString('token', token);
    await prefs.setString('user_json', jsonEncode(user));
    _user = user;
    notifyListeners();
  }

  Future<void> loginGuest() async {
    final guestUser = {
      'id': 'guest',
      'name': 'زائر',
      'email': 'guest@mohassibe.com',
      'role': 'guest'
    };
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', 'guest_token');
    await prefs.setString('user_json', jsonEncode(guestUser));
    _user = guestUser;
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user_json');
    _user = null;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    try {
      final user = await AuthService.getMe();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_json', jsonEncode(user));
      _user = user;
      notifyListeners();
    } catch (e) {
      debugPrint('Error refreshing user: $e');
    }
  }
}
