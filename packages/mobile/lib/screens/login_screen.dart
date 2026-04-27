import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import '../core/theme.dart';
import '../core/app_localizations.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  bool _rememberMe = false;

  Future<void> _login() async {
    if (_emailCtrl.text.isEmpty || _passwordCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(context.tr('emailHint'))),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().login(
            _emailCtrl.text.trim(),
            _passwordCtrl.text,
            rememberMe: _rememberMe,
          );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('${context.tr('error')}: ${e.toString()}'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loginGuest() async {
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().loginGuest();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('${context.tr('error')}: ${e.toString()}'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.bg, Color(0xFF1E293B)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(32),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 30,
                          offset: const Offset(0, 10)),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildLogo(),
                      const SizedBox(height: 32),
                      _buildTextField(_emailCtrl, context.tr('email'),
                          Icons.email_outlined, false),
                      const SizedBox(height: 16),
                      _buildTextField(_passwordCtrl, context.tr('password'),
                          Icons.lock_outline, true),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Checkbox(
                            value: _rememberMe,
                            onChanged: (val) {
                              setState(() => _rememberMe = val ?? false);
                            },
                            activeColor: AppColors.primary,
                          ),
                          Text(context.tr('rememberMe'), style: const TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildLoginButton(),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _buildGuestButton()),
                          const SizedBox(width: 12),
                          Expanded(child: _buildRegisterButton()),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
              gradient: AppColors.primaryGradient, shape: BoxShape.circle),
          child: const Icon(Icons.account_balance_wallet_rounded,
              color: Colors.white, size: 40),
        ),
        const SizedBox(height: 16),
        Text(context.tr('appName'),
            style: const TextStyle(
                color: AppColors.text,
                fontSize: 28,
                fontWeight: FontWeight.w900)),
        Text(context.tr('luxuryBusiness'),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
      ],
    );
  }

  Widget _buildTextField(
      TextEditingController ctrl, String hint, IconData icon, bool password) {
    return TextField(
      controller: ctrl,
      obscureText: password && _obscure,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.primary),
        suffixIcon: password
            ? IconButton(
                icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility,
                    color: AppColors.textMuted),
                onPressed: () => setState(() => _obscure = !_obscure),
              )
            : null,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide.none),
      ),
    );
  }

  Widget _buildLoginButton() {
    return ElevatedButton(
      onPressed: _loading ? null : _login,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        elevation: 10,
        shadowColor: AppColors.primary.withValues(alpha: 0.3),
      ),
      child: _loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                  color: Colors.white, strokeWidth: 2))
          : Text(context.tr('loginButton'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildGuestButton() {
    return TextButton(
      onPressed: _loading ? null : _loginGuest,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        minimumSize: const Size(0, 54),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(color: AppColors.primary, width: 1)),
      ),
      child: Text(context.tr('guestLogin'),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildRegisterButton() {
    return TextButton(
      onPressed: _loading
          ? null
          : () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RegisterScreen()),
              );
            },
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        minimumSize: const Size(0, 54),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(color: AppColors.primary, width: 1)),
      ),
      child: Text(context.tr('newAccount'),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
    );
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }
}
