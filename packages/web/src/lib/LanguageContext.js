'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

const LanguageContext = createContext();

export const translations = {
    ar: {
        // Sidebar
        dashboard: 'الرئيسية',
        sales: 'نقطة البيع (POS)',
        products: 'المنتجات والمخزن',
        invoices: 'الفواتير السريعة',
        expenses: 'المصاريف',
        debts: 'الديون',
        customers: 'العملاء',
        suppliers: 'الموردين',
        returns: 'المرتجعات',
        activities: 'الأنشطة',
        archive: 'الأرشيف',
        reports: 'التقارير',
        statement: 'كشف الحساب',
        settings: 'الإعدادات',
        staff: 'العمال والرواتب',
        logout: 'تسجيل الخروج',
        back: 'رجوع',
    warehouses: 'إدارة المخازن',
    warehouse: 'المخزن',
    movements: 'حركة المخزن',
    transfer: 'نقل بضاعة',
    add_stock: 'إضافة مخزون',
    inventory_reports: 'تقارير المخزون',
    low_stock_alerts: 'تنبيهات النقص',
    warehouse_name: 'اسم المخزن',
    location: 'الموقع',
    manager: 'المسؤول',
    stock_value: 'قيمة المخزون',
    select_warehouse: 'اختر المخزن',
    manage_invoices: 'إدارة الفواتير',
    invoice_type: 'نوع الفاتورة',
    quotation: 'عرض سعر',
    debt_sale: 'بيع دين',
    purchase: 'فاتورة شراء',
    invoice_date: 'تاريخ الفاتورة',
    total_amount: 'المبلغ الإجمالي',
    paid_amount: 'المبلغ المدفوع',
    remaining_amount: 'المبلغ المتبقي',
    invoice_status: 'حالة الفاتورة',
    convert_to_sale: 'تحويل لعملية بيع',
    print_invoice: 'طباعة الفاتورة',
    export_pdf: 'تصدير PDF',
    create_new_invoice: 'إنشاء فاتورة جديدة',
    all_types: 'جميع الأنواع',
    customer_label: 'العميل / المستلم',
    supplier_label: 'المورد',
    invoice_number: 'رقم الفاتورة',
    quotation_number: 'رقم عرض السعر',
    quotation_date: 'تاريخ عرض السعر',

        // Header
        search_placeholder: 'البحث عن منتجات أو وظائف...',
        system_mgmt: 'نظام إدارة شامل لمتجرك',
        notifications: 'الإشعارات',

        // Dashboard Home
        products_in_stock: 'المنتجات في المخزن',
        total_expenses: 'إجمالي المصروفات (الشهر)',
        total_sales_today: 'إجمالي المبيعات اليوم',
        due_debts: 'الديون المستحقة',
        sales_analysis: 'تحليل المبيعات الأسبوعي',
        last_7_days: 'أداء الـ 7 أيام الماضية',
        live: 'مباشر',
        recent_activity: 'آخر الحركات',
        live_log: 'سجل مباشر',
        quick_actions: 'الإجراءات السريعة',
        syncing: 'جاري المزامنة مع السحابة...',

        // Common Buttons
        save: 'حفظ',
        cancel: 'إلغاء',
        edit: 'تعديل',
        delete: 'حذف',
        add_product: 'إضافة منتج',
        create_invoice: 'إنشاء فاتورة',
        more: 'المزيد',

        // Settings
        profile: 'الملف الشخصي',
        security: 'الأمان والحماية',
        appearance: 'التصميم والمظهر',
        data_mgmt: 'البيانات والنسخ',
        language: 'اللغة',
        theme: 'الوضع اللوني',
        light: 'فاتح',
        dark: 'داكن',
        font_size: 'حجم الخط',
        primary_color: 'لون الواجهة الرئيسية',

        // Store Settings
        store_settings: 'إعدادات المتجر / الشركة',
        store_name: 'اسم المتجر أو الشركة',
        store_logo: 'شعار المتجر',
        address: 'العنوان',
        currency: 'العملة المستخدمة',
        tax_number: 'الرقم الضريبي',

        // Invoice Settings
        invoice_settings: 'إعدادات الفواتير',
        enable_tax_on_invoice: 'تفعيل الضريبة في الفاتورة',
        invoice_format: 'تنسيق رقم الفاتورة',
        default_invoice_notes: 'ملاحظات افتراضية للفاتورة',
        show_logo_on_invoice: 'عرض الشعار في الفاتورة',

        // Inventory Settings
        inventory_settings: 'إعدادات المخزن',
        enable_inventory_mgmt: 'تفعيل إدارة المخزون',
        min_stock_alert: 'تنبيه الحد الأدنى للمخزون',
        stock_valuation_method: 'طريقة تقييم المخزون',
        invoice_affects_stock: 'الفواتير تؤثر على المخزون',

        // Tax Settings
        tax_settings: 'إعدادات الضرائب',
        default_tax_rate: 'نسبة الضريبة الافتراضية',
        tax_calc_method: 'طريقة حساب الضريبة',
        tax_added: 'مضافة للسعر',
        tax_included: 'شاملة في السعر',

        // Users & Permissions
        users_permissions: 'المستخدمين والصلاحيات',
        add_user: 'إضافة مستخدم جديد',
        user_permissions: 'صلاحيات المستخدم',
        access_sales: 'الوصول للمبيعات',
        access_inventory: 'الوصول للمخزون',
        access_reports: 'الوصول للتقارير',

        // Reports Settings
        reports_settings: 'إعدادات التقارير',
        default_report_period: 'الفترة الافتراضية للتقارير',
        export_formats: 'صيغ التصدير المتاحة',

        // Smart Alerts
        smart_alerts: 'التنبيهات الذكية',
        debt_alert: 'تنبيه ديون العملاء',
        unpaid_invoice_alert: 'تنبيه فواتير غير مدفوعة',
        high_expenses_alert: 'تنبيه مصاريف مرتفعة',

        // Sync & Cloud
        sync_settings: 'المزامنة والسحابة',
        cloud_backup: 'النسخ الاحتياطي السحابي',
        device_sync: 'المزامنة بين الأجهزة',

        // Security Advanced
        sign_out_all: 'تسجيل الخروج من جميع الأجهزة',
        app_lock: 'تفعيل قفل التطبيق',
        sensitive_op_confirm: 'تأكيد العمليات الحساسة',
        login_history: 'سجل تسجيل الدخول',

        // App Info
        app_info: 'معلومات التطبيق',
        app_version: 'إصدار التطبيق',
        app_name: 'اسم التطبيق',
        copyright: 'حقوق الملكية',
        privacy_policy: 'سياسة الخصوصية',
        terms_of_use: 'شروط الاستخدام',

        // Purchases
        new_purchase: 'أمر شراء جديد',
        manage_purchases: 'إدارة المشتريات',
        track_purchases: 'تتبع جميع أوامر الشراء وفواتير الموردين',
        total_purchases: 'إجمالي المشتريات',
        this_month: 'هذا الشهر',
        search_placeholder_purchases: 'ابحث عن مورد، بيان، أو قيمة...',
        all_suppliers: 'جميع الموردين',
        no_purchases: 'لا توجد مشتريات مسجلة بعد',
        supplier_label: 'مورد التوريد',
        amount_label: 'قيمة الفاتورة',
        date_label: 'التاريخ',
        notes_label: 'تفاصيل الشحنة / ملاحظات',
        save_purchase: 'حفظ وتأكيد العملية',

        // Returns
        manage_returns: 'إدارة المرتجعات',
        process_returns: 'معالجة مرتجعات المبيعات واسترجاع المخزون',
        start_return: 'بدء عملية مرتجع',
        no_returns: 'لا توجد عمليات مرتجع مسجلة بعد',
        new_return: 'عملية مرتجع جديدة',
        original_invoice: 'رقم الفاتورة الأصلية',
        search_invoice_placeholder: 'مثال: INV-123456...',
        invoice_data: 'بيانات الفاتورة الأصلية',
        select_return_items: 'اختر المنتجات المراد إرجاعها',
        original_qty: 'الكمية الأصلية',
        total_return: 'إجمالي المرتجع',
        complete_return: 'إتمام عملية المرتجع',

        // Suppliers
        supplier_network: 'شبكة الموردين',
        manage_suppliers: 'إدارة وتتبع جميع موردي المنشأة',
        add_supplier: 'إضافة مورد جديد',
        search_suppliers_placeholder: 'ابحث باسم المورد أو الشركة...',
        no_suppliers: 'لا يوجد موردون مضافون بعد',
        edit_supplier: 'تعديل بيانات المورد',
        supplier_name: 'اسم المورد',
        company_name: 'اسم الشركة / المؤسسة',
        phone: 'رقم الجوال',
        email: 'البريد الإلكتروني',
        due_balance: 'الرصيد المستحق',
        settled: 'مسوّى',
        has_balance: 'لديه رصيد',
        search_supplier_placeholder: 'ابحث باسم المورد أو الشركة...',
        edit_supplier_data: 'تعديل بيانات المورد',
        new_supplier: 'مورد جديد',
        save_changes: 'حفظ التغييرات',
        register_supplier: 'تسجيل المورد',
        supplier_name_label: 'اسم المورد',
        supplier_name_placeholder: 'اسم المورد الكامل...',
        company_name_label: 'اسم الشركة / المؤسسة',
        company_name_placeholder: 'الشركة أو المؤسسة التجارية',
        phone_label: 'رقم الجوال',
        email_label: 'البريد الإلكتروني',

        // Statement Page
        customer_statement: 'كشف حساب العميل',
        statement_subtitle: 'سجل تفصيلي لجميع المعاملات المالية',
        loading_statement: 'جاري تحميل كشف الحساب...',
        no_transactions: 'لا توجد عمليات في هذه الفترة',
        final_summary: 'الملخص المالي النهائي',
        total_debit: 'إجمالي المدين',
        total_credit: 'إجمالي الدائن',
        final_balance: 'الرصيد النهائي',
        period_today: 'اليوم',
        period_week: 'هذا الأسبوع',
        period_month: 'هذا الشهر',
        period_year: 'هذا العام',
        period_custom: 'مخصص',
        system_version: 'إصدار النظام',

        // Login
        welcome_back: 'مرحباً بك مجدداً',
        login_to_account: 'تسجيل الدخول إلى حسابك',
        login_to_system: 'تسجيل الدخول للنظام',
        email_address: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        login_button: 'تسجيل الدخول',
        secure_login: 'دخول آمن',
        guest_login: 'المتابعة بدون حساب',
        forgot_password: 'نسيت كلمة المرور؟',
        no_account: 'ليس لديك حساب؟',
        register_now: 'سجل الآن',
        smart: 'الذكي',
        system_description: 'نظام إدارة الحسابات المتكامل للمنشآت العصرية',
        secure_system: 'نظام مشفر ومحمي بالكامل',
        all_rights_reserved: 'جميع الحقوق محفوظة',
        login_error: 'فشل الاتصال بالخادم. يرجى التحقق من بياناتك.',
        guest_error: 'حدث خطأ أثناء الدخول كضيف.',
        register_new_account: 'إنشاء حساب جديد',
        full_name: 'الاسم الكامل',
        already_have_account: 'لديك حساب بالفعل؟',
        register_error: 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.',

        // Premium Login/Register
        system_name_full: 'رائد لإدارة الحسابات والمخازن',
        smart_reports: 'تقارير ذكية',
        smart_reports_desc: 'تحليلات متقدمة لنمو أعمالك بشكل دقيق.',
        secure_cloud: 'سحابة آمنة',
        secure_cloud_desc: 'بياناتك محمية بتشفير عالي المستوى.',
        anywhere_access: 'وصول من أي مكان',
        anywhere_access_desc: 'أدر عملك من أي جهاز وفي أي وقت.',
        active_users: 'مستخدم نشط',
        secure_access_required: 'يرجى إدخال بيانات الاعتماد الخاصة بك',
        remember_me: 'تذكرني',
        or_join_us: 'أو انضم إلينا عبر',
        create_account_title: 'ابدأ رحلتك مع رائد',
        join_community_desc: 'انضم إلى آلاف الشركات التي تدير أعمالها بذكاء.',
        instant_setup: 'إعداد فوري',
        instant_setup_desc: 'ابدأ العمل في أقل من دقيقتين.',
        realtime_sync: 'مزامنة فورية',
        realtime_sync_desc: 'بياناتك محدثة دائماً على جميع الأجهزة.',
        unlimited_storage: 'تخزين غير محدود',
        unlimited_storage_desc: 'احفظ جميع فواتيرك وسجلاتك بأمان.',
        get_started: 'ابدأ الآن',
        create_new_workspace: 'إنشاء مساحة عمل جديدة',

        // Common Entities & Types
        cash_customer: 'عميل نقدي',
        general_supplier: 'مورد عام',
        daily_sales: 'مبيعات يومية',
        debt: 'دين',
        stock_input: 'توريد مخزن',
        unit_pcs: 'قطعة',
        available: 'متوفر',
        total_net: 'الإجمالي الصافي',
        confirm_success: 'تمت العملية بنجاح ✨',
        confirm_error: 'حدث خطأ أثناء المعالجة ❌',
        select_customer_debt: 'يرجى اختيار اسم العميل لفاتورة الدين 📝',
        loading_data: 'جاري تحميل البيانات...',
        
        // Dynamic Types (Lowercase)
        sale: 'بيع',
        purchase: 'شراء',
        quotation: 'عرض سعر',
        quotations: 'عروض أسعار',
        return: 'مرتجع',
        payment: 'دفعة',
        debt: 'دين',
        individual: 'فرد',
        company: 'شركة',
        staff_mgmt: 'إدارة العمال والرواتب',
        add_staff: 'إضافة عامل جديد',
        staff_name: 'اسم العامل',
        staff_role: 'الوظيفة / الدور',
        base_salary: 'الراتب الأساسي',
        remaining_salary: 'المتبقي من الراتب',
        pay_salary: 'صرف راتب / دفعة',
        salary_advance: 'سلفة',
        salary_credit: 'استحقاق راتب',
        salary_payment: 'دفعة راتب',
        staff_statement: 'كشف حساب العامل',
        total_earned: 'إجمالي المستحقات',
        total_paid: 'إجمالي المدفوعات',

        // Additional Settings Keys
        admin_full_access: 'وصول كامل (مدير)',
        limited_access: 'وصول محدود',
        track_stock_levels: 'تتبع مستويات المخزون',
        allow_negative_inventory: 'السماح بالمخزون السالب',
        low_stock_warning: 'تنبيه الحد الأدنى للمخزون',
        apply_tax_on_products: 'تطبيق الضريبة على المنتجات',
        apply_tax_on_services: 'تطبيق الضريبة على الخدمات',
        manage_users: 'إدارة قائمة المستخدمين',
        invoice_notifications: 'تنبيهات الفواتير',
        expense_notifications: 'تنبيهات المصاريف',
        stock_notifications: 'تنبيهات المخزون',
        debt_notifications: 'تنبيهات الديون',
        export_backup: 'تصدير نسخة احتياطية',
        import_backup: 'استيراد نسخة احتياطية',
        sync_subtitle: 'قم بمزامنة بياناتك تلقائياً مع السحابة للأمان والوصول من أجهزة متعددة.',
        sync_now: 'مزامنة الآن',
        password_current: 'كلمة المرور الحالية',
        password_new: 'كلمة المرور الجديدة',
        password_confirm: 'تأكيد كلمة المرور الجديدة',
        can_access_sales: 'الوصول للمبيعات',
        can_create_invoices: 'إنشاء الفواتير',
        can_manage_inventory: 'إدارة المخزون',
        can_view_reports: 'عرض التقارير',
        can_manage_customers: 'إدارة العملاء',
        can_manage_expenses: 'إدارة المصاريف',
        can_access_settings: 'الوصول للإعدادات',
        permissions: 'الصلاحيات',
        actions: 'الإجراءات',
        role: 'الدور / الصلاحية',
        name: 'الاسم',
        invoice_notif_desc: 'تنبيه عند إنشاء فاتورة جديدة',
        expense_notif_desc: 'تنبيه عند إضافة مصروف جديد',
        stock_notif_desc: 'تنبيه عند اقتراب نفاذ المخزون',
        debt_notif_desc: 'تنبيه عند حلول موعد الدين',
        debt_alert_desc: 'تتبع ديون العملاء لأكثر من 30 يوماً',
        high_expenses_desc: 'تنبيه عند تجاوز المصاريف للميزانية',
        min_stock_desc: 'توقع حاجة المخزون للتوريد',
        unpaid_invoice_desc: 'متابعة تلقائية للفواتير غير المدفوعة',
        export_backup_desc: 'تحميل قاعدة البيانات كاملة بصيغة JSON/SQL',
        import_backup_desc: 'استعادة البيانات من ملف نسخة احتياطية سابق',

        // Reports Page
        reports_summary: 'نظرة شاملة ومباشرة على أداء منشأتك',
        last_update: 'آخر تحديث للبيانات',
        print_report: 'تصدير / طباعة التقرير',
        sales_analysis: 'تحليل النمو المالي',
        daily_performance: 'أداء التدفقات النقدية اليومية',
        last_7_days: 'آخر 7 أيام',
        top_articles: 'أعلى الأصناف',
        most_sold_products: 'المنتجات الأكثر مبيعاً',
        operational_efficiency: 'مؤشرات الكفاءة التشغيلية',
        live_stats: 'إحصائيات وقراءات حية',
        total_products: 'إجمالي المنتجات',
        active_in_stock: 'منتج نشط بالمخزون',
        customer_base: 'قاعدة العملاء',
        registered_customers: 'عميل مسجل لدينا',
        stock_alerts: 'تحذيرات المخزون',
        low_stock_reached: 'أصناف وصلت للحد الأدنى',
        inactive_30d: 'الخاملة (30 يوم)',
        no_recent_sales: 'منتجات لم تبع مؤخراً',
        profitability_analysis: 'تحليل الربحية',
        net_performance: 'مؤشر الأداء المالي الصافي',
        profit_margin_ratio: 'نسبة هامش الربح المحقق',
        excellent_perf: 'أداء ممتاز',
        good_perf: 'أداء جيد',
        target_level: 'المستوى المستهدف',

        // Archive Page
        archive_summary: 'سجل تاريخي شامل لجميع العمليات المالية',
        recorded_transactions: 'معاملة مسجلة',
        export_excel: 'تصدير Excel',
        search_placeholder: 'ابحث برقم الفاتورة، اسم العميل، أو ملاحظات...',
        all_transaction_types: 'جميع أنواع العمليات',
        transaction: 'المعاملة',
        client_details: 'البيان / العميل',
        no_transactions_found: 'لا توجد معاملات تطابق البحث',
        general_statement: 'بيان عام',
        sale_invoice: 'فاتورة مبيعات',
        purchase_invoice: 'فاتورة توريد',
        operational_expense: 'مصروف تشغيلي',
        sale_return: 'مرتجع مبيعات',

        // Debts Page
        debts_summary: 'متابعة الديون والالتزامات المالية',
        due_to_us: 'مستحقات لنا',
        due_by_us: 'التزامات علينا',
        to_us: 'لنا',
        to_pay: 'علينا',
        no_debt_records: 'لا توجد سجلات ديون في هذا القسم',
        register_payment: 'تسجيل دفعة',
        payment_amount: 'مبلغ الدفعة',
        confirm_save: 'تأكيد الحفظ',
        operation_success: 'عملية ناجحة ✨',
        payment_recorded_success: 'تم تسجيل الدفعة وتحديث الرصيد بنجاح',
        operation_failed: 'فشل العملية ❌',
        payment_recorded_failed: 'حدث خطأ أثناء تسجيل الدفعة',
        solde_restant: 'المبلغ المتبقي',

        // Notifications
        new: 'جديد',
        new_activity: 'عملية جديدة',
        new_sales_invoice: 'تمت إضافة فاتورة مبيعات جديدة',
        stock_alert: 'تنبيه مخزون',
        tax_rate: 'نسبة الضريبة (%)',
    },
    fr: {
        // Sidebar
        dashboard: 'Tableau de bord',
        sales: 'Point de vente (POS)',
        products: 'Produits et Stock',
        invoices: 'Factures Rapides',
        expenses: 'Dépenses',
        debts: 'Dettes',
        customers: 'Clients',
        suppliers: 'Fournisseurs',
        returns: 'Retours',
        activities: 'Activités',
        archive: 'Archive',
        reports: 'Rapports',
        statement: 'Relevé de compte',
        settings: 'Paramètres',
        staff: 'Personnel & Salaires',
        logout: 'Déconnexion',
        back: 'Retour',
    warehouses: 'Gestion des Magasins',
    warehouse: 'Magasin',
    movements: 'Mouvements Stock',
    transfer: 'Transfert Stock',
    add_stock: 'Ajouter Stock',
    inventory_reports: 'Rapports Stock',
    low_stock_alerts: 'Alertes Stock',
    warehouse_name: 'Nom du Magasin',
    location: 'Emplacement',
    manager: 'Responsable',
    stock_value: 'Valeur du Stock',
    select_warehouse: 'Choisir Magasin',
    manage_invoices: 'Gestion des Factures',
    invoice_type: 'Type de Facture',
    quotation: 'Devis / Offre',
    debt_sale: 'Vente à Crédit',
    purchase: 'Facture d\'Achat',
    invoice_date: 'Date Facture',
    total_amount: 'Montant Total',
    paid_amount: 'Montant Payé',
    remaining_amount: 'Reste à Payer',
    invoice_status: 'Statut',
    convert_to_sale: 'Convertir en Vente',
    print_invoice: 'Imprimer',
    export_pdf: 'Exporter PDF',
    create_new_invoice: 'Nouvelle Facture',
    all_types: 'Tous les Types',
    customer_label: 'Client / Destinataire',
    supplier_label: 'Fournisseur',
    invoice_number: 'N° Facture',
    quotation_number: 'N° Devis',
    quotation_date: 'Date Devis',

        // Header
        search_placeholder: 'Rechercher des produits ou des fonctions...',
        system_mgmt: 'Système de gestion complet pour votre boutique',
        notifications: 'Notifications',

        // Dashboard Home
        products_in_stock: 'Produits en stock',
        total_expenses: 'Dépenses totales (Mois)',
        total_sales_today: 'Ventes totales aujourd\'hui',
        due_debts: 'Dettes dues',
        sales_analysis: 'Analyse hebdomadaire des ventes',
        last_7_days: 'Performance des 7 derniers jours',
        live: 'En direct',
        recent_activity: 'Activités récentes',
        live_log: 'Journal en direct',
        quick_actions: 'Actions rapides',
        syncing: 'Synchronisation avec le cloud...',

        // Common Buttons
        save: 'Enregistrer',
        cancel: 'Annuler',
        edit: 'Modifier',
        delete: 'Supprimer',
        add_product: 'Ajouter un produit',
        create_invoice: 'Créer une facture',
        more: 'Plus',

        // Settings
        profile: 'Profil',
        security: 'Sécurité',
        appearance: 'Apparence',
        data_mgmt: 'Données et Sauvegarde',
        language: 'Langue',
        theme: 'Thème',
        light: 'Clair',
        dark: 'Sombre',
        font_size: 'Taille de police',
        primary_color: 'Couleur principale',

        // Store Settings
        store_settings: 'Paramètres Boutique / Entreprise',
        store_name: 'Nom de la Boutique / Entreprise',
        store_logo: 'Logo de la Boutique',
        address: 'Adresse',
        currency: 'Devise utilisée',
        tax_number: 'N° d\'identification fiscale',

        // Invoice Settings
        invoice_settings: 'Paramètres Facturation',
        enable_tax_on_invoice: 'Activer la taxe sur la facture',
        invoice_format: 'Format numéro de facture',
        default_invoice_notes: 'Notes par défaut',
        show_logo_on_invoice: 'Afficher le logo sur la facture',

        // Inventory Settings
        inventory_settings: 'Paramètres Stock',
        enable_inventory_mgmt: 'Activer la gestion de stock',
        min_stock_alert: 'Alerte stock minimum',
        stock_valuation_method: 'Méthode d\'évaluation',
        invoice_affects_stock: 'Ventes impactent le stock',

        // Tax Settings
        tax_settings: 'Paramètres Taxes',
        default_tax_rate: 'Taux de taxe par défaut',
        tax_calc_method: 'Calcul de la taxe',
        tax_added: 'Ajoutée au prix',
        tax_included: 'Incluse dans le prix',

        // Users & Permissions
        users_permissions: 'Utilisateurs & Permissions',
        add_user: 'Ajouter un utilisateur',
        user_permissions: 'Permissions utilisateur',
        access_sales: 'Accès aux ventes',
        access_inventory: 'Accès au stock',
        access_reports: 'Accès aux rapports',

        // Reports Settings
        reports_settings: 'Paramètres Rapports',
        default_report_period: 'Période par défaut',
        export_formats: 'Formats d\'exportation',

        // Smart Alerts
        smart_alerts: 'Alertes Intelligentes',
        debt_alert: 'Alerte dettes clients',
        unpaid_invoice_alert: 'Alerte factures impayées',
        high_expenses_alert: 'Alerte dépenses élevées',

        // Sync & Cloud
        sync_settings: 'Synchronisation & Cloud',
        cloud_backup: 'Sauvegarde Cloud',
        device_sync: 'Mise à jour multi-appareils',

        // Security Advanced
        sign_out_all: 'Déconnexion globale',
        app_lock: 'Verrouillage application',
        sensitive_op_confirm: 'Confirmer op. sensibles',
        login_history: 'Historique de connexion',

        // App Info
        app_info: 'À propos de l\'application',
        app_version: 'Version de l\'application',
        app_name: 'Nom de l\'application',
        copyright: 'Copyright',
        privacy_policy: 'Confidentialité',
        terms_of_use: 'Conditions d\'utilisation',

        // Purchases
        new_purchase: 'Nouvel achat',
        manage_purchases: 'Gestion des achats',
        track_purchases: 'Suivre tous les bons de commande et factures fournisseurs',
        total_purchases: 'Total des achats',
        this_month: 'Ce mois',
        search_placeholder_purchases: 'Rechercher un fournisseur, libellé ou valeur...',
        all_suppliers: 'Tous les fournisseurs',
        no_purchases: 'Aucun achat enregistré',
        supplier_label: 'Fournisseur',
        amount_label: 'Montant de la facture',
        date_label: 'Date',
        notes_label: 'Détails / Notes',
        save_purchase: 'Confirmer l\'achat',

        // Returns
        manage_returns: 'Gestion des retours',
        process_returns: 'Traiter les retours de ventes',
        start_return: 'Commencer un retour',
        no_returns: 'Aucun retour enregistré',
        new_return: 'Nouveau retour',
        original_invoice: 'Facture originale',
        search_invoice_placeholder: 'Ex: INV-123456...',
        invoice_data: 'Détails de la facture',
        select_return_items: 'Articles à retourner',
        original_qty: 'Quantité originale',
        total_return: 'Total retour',
        complete_return: 'Finaliser le retour',

        // Suppliers
        supplier_network: 'Réseau de fournisseurs',
        manage_suppliers: 'Gérer tous les fournisseurs',
        add_supplier: 'Ajouter un fournisseur',
        search_suppliers_placeholder: 'Rechercher par nom ou société...',
        no_suppliers: 'Aucun fournisseur ajouté',
        edit_supplier: 'Modifier le fournisseur',
        supplier_name: 'Nom du fournisseur',
        company_name: 'Nom de la société',
        phone: 'Téléphone',
        email: 'Email',
        due_balance: 'Solde dû',
        settled: 'Solder',
        has_balance: 'A un solde',
        search_supplier_placeholder: 'Rechercher par nom ou société...',
        edit_supplier_data: 'Modifier le fournisseur',
        new_supplier: 'Nouveau fournisseur',
        save_changes: 'Enregistrer les modifications',
        register_supplier: 'Enregistrer le fournisseur',
        supplier_name_label: 'Nom du fournisseur',
        supplier_name_placeholder: 'Nom complet du fournisseur...',
        company_name_label: 'Nom de la société',
        company_name_placeholder: 'Entreprise / Société',
        phone_label: 'Téléphone',
        email_label: 'Email',

        // Statement Page
        customer_statement: 'Relevé de compte client',
        statement_subtitle: 'Historique détaillé de toutes les transactions',
        loading_statement: 'Chargement du relevé...',
        no_transactions: 'Aucune opération pour cette période',
        final_summary: 'Résumé Financier Final',
        total_debit: 'Total Débit',
        total_credit: 'Total Crédit',
        final_balance: 'Solde Final',
        period_today: "Aujourd'hui",
        period_week: 'Cette semaine',
        period_month: 'Ce mois',
        period_year: 'Cette année',
        period_custom: 'Personnalisé',
        system_version: 'Version du système',

        // Login
        welcome_back: 'Bon retour',
        login_to_account: 'Connectez-vous à votre compte',
        login_to_system: 'Connexion au Système',
        email_address: 'Adresse e-mail',
        password: 'Mot de passe',
        login_button: 'Se connecter',
        secure_login: 'Connexion Sécurisée',
        guest_login: 'Continuer sans compte',
        forgot_password: 'Mot de passe oublié ?',
        no_account: 'Pas de compte ?',
        register_now: 'S\'inscrire',
        smart: 'Intelligent',
        system_description: 'Système de gestion comptable intégré pour entreprises modernes',
        secure_system: 'Système entièrement crypté et protégé',
        all_rights_reserved: 'Tous droits réservés',
        login_error: 'Échec de la connexion. Veuillez vérifier vos identifiants.',
        guest_error: 'Erreur lors de la connexion en tant qu\'invité.',
        register_new_account: 'Créer un nouveau compte',
        full_name: 'Nom complet',
        already_have_account: 'Vous avez déjà un compte ?',
        register_error: 'Erreur lors de l\'inscription. Veuillez réessayer.',

        // Premium Login/Register
        system_name_full: 'Gestionnaire Financier & de Stock Raid',
        smart_reports: 'Rapports Intelligents',
        smart_reports_desc: 'Analyses avancées pour la croissance de votre entreprise.',
        secure_cloud: 'Cloud Sécurisé',
        secure_cloud_desc: 'Vos données sont protégées par un cryptage de haut niveau.',
        anywhere_access: 'Accès Partout',
        anywhere_access_desc: 'Gérez votre entreprise depuis n\'importe quel appareil.',
        active_users: 'Utilisateurs actifs',
        secure_access_required: 'Veuillez entrer vos identifiants',
        remember_me: 'Se souvenir de moi',
        or_join_us: 'Ou rejoignez-nous via',
        create_account_title: 'Commencez votre voyage avec Raid',
        join_community_desc: 'Rejoignez des milliers d\'entreprises qui gèrent intelligemment.',
        instant_setup: 'Configuration Instantanée',
        instant_setup_desc: 'Commencez à travailler en moins de 2 minutes.',
        realtime_sync: 'Sync en Temps Réel',
        realtime_sync_desc: 'Données toujours à jour sur tous vos appareils.',
        unlimited_storage: 'Stockage Illimité',
        unlimited_storage_desc: 'Sauvegardez toutes vos factures en toute sécurité.',
        get_started: 'Commencer Maintenant',
        create_new_workspace: 'Créer un nouvel espace de travail',

        // Common Entities & Types
        cash_customer: 'Client Comptant',
        general_supplier: 'Fournisseur Gén.',
        daily_sales: 'Ventes Quotidiennes',
        debt: 'Crédit/Dette',
        stock_input: 'Entrée Stock',
        unit_pcs: 'Pcs',
        available: 'Disponible',
        total_net: 'Total Net',
        confirm_success: 'Opération réussie ✨',
        confirm_error: 'Erreur lors du traitement ❌',
        select_customer_debt: 'Veuillez choisir un client pour la facture de crédit 📝',
        loading_data: 'Chargement des données...',

        // Dynamic Types (Lowercase)
        sale: 'Vente',
        purchase: 'Achat',
        quotation: 'Devis',
        quotations: 'Devis',
        return: 'Retour',
        payment: 'Paiement',
        debt: 'Dette',
        individual: 'Individuel',
        company: 'Société',
        staff_mgmt: 'Gestion du Personnel',
        add_staff: 'Ajouter un employé',
        staff_name: 'Nom de l\'employé',
        staff_role: 'Poste / Rôle',
        base_salary: 'Salaire de base',
        remaining_salary: 'Solde restant',
        pay_salary: 'Verser salaire / acompte',
        salary_advance: 'Avance',
        salary_credit: 'Salaire dû',
        salary_payment: 'Paiement salaire',
        staff_statement: 'Relevé de l\'employé',
        total_earned: 'Total dû',
        total_paid: 'Total payé',

        // Additional Settings Keys
        admin_full_access: 'Accès complet (Admin)',
        limited_access: 'Accès limité',
        track_stock_levels: 'Suivre les niveaux de stock',
        allow_negative_inventory: 'Autoriser le stock négatif',
        low_stock_warning: 'Alerte stock bas',
        apply_tax_on_products: 'Appliquer taxe sur produits',
        apply_tax_on_services: 'Appliquer taxe sur services',
        manage_users: 'Gérer les utilisateurs',
        invoice_notifications: 'Notifications factures',
        expense_notifications: 'Notifications dépenses',
        stock_notifications: 'Notifications stock',
        debt_notifications: 'Notifications dettes',
        export_backup: 'Exporter sauvegarde',
        import_backup: 'Importer sauvegarde',
        sync_subtitle: 'Synchronisez vos données automatiquement avec le cloud pour la sécurité.',
        sync_now: 'Synchroniser maintenant',
        password_current: 'Mot de passe actuel',
        password_new: 'Nouveau mot de passe',
        password_confirm: 'Confirmer mot de passe',
        can_access_sales: 'Accès aux ventes',
        can_create_invoices: 'Créer des factures',
        can_manage_inventory: 'Gérer le stock',
        can_view_reports: 'Voir les rapports',
        can_manage_customers: 'Gérer les clients',
        can_manage_expenses: 'Gérer les dépenses',
        can_access_settings: 'Accès paramètres',
        permissions: 'Permissions',
        actions: 'Actions',
        role: 'Rôle / Fonction',
        name: 'Nom',
        invoice_notif_desc: 'Alerte lors de la création d\'une facture',
        expense_notif_desc: 'Alerte lors de l\'ajout d\'une dépense',
        stock_notif_desc: 'Alerte sur les articles en rupture',
        debt_notif_desc: 'Alerte sur les échéances de dettes',
        debt_alert_desc: 'Suivre les dettes clients de plus de 30 jours',
        high_expenses_desc: 'Alerte quand les dépenses dépassent le budget',
        min_stock_desc: 'Réapprovisionnement prédictif du stock',
        unpaid_invoice_desc: 'Suivi auto des factures impayées',
        export_backup_desc: 'Télécharger toute la base en JSON/SQL',
        import_backup_desc: 'Restaurer depuis un fichier de sauvegarde',

        // Reports Page
        reports_summary: 'Aperçu global de votre établissement',
        last_update: 'Dernière mise à jour',
        print_report: 'Imprimer le rapport',
        sales_analysis: 'Analyse de croissance',
        daily_performance: 'Performance quotidienne',
        last_7_days: '7 derniers jours',
        top_articles: 'Top articles',
        most_sold_products: 'Produits plus vendus',
        operational_efficiency: 'Efficacité opérationnelle',
        live_stats: 'Statistiques en direct',
        total_products: 'Total produits',
        active_in_stock: 'Articles en stock',
        customer_base: 'Base clients',
        registered_customers: 'Clients enregistrés',
        stock_alerts: 'Alertes stock',
        low_stock_reached: 'Stock minimum atteint',
        inactive_30d: 'Inactifs (30j)',
        no_recent_sales: 'Sans ventes récentes',
        profitability_analysis: 'Analyse de rentabilité',
        net_performance: 'Indicateur de performance net',
        profit_margin_ratio: 'Marge bénéficiaire réalisée',
        excellent_perf: 'Excellent',
        good_perf: 'Bon performance',
        target_level: 'Cible',

        // Archive Page
        archive_summary: 'Historique complet de toutes les transactions',
        recorded_transactions: 'Transactions enregistrées',
        export_excel: 'Exporter Excel',
        search_placeholder: 'N° Facture, Nom client, ou notes...',
        all_transaction_types: 'Tous les types',
        transaction: 'Transaction',
        client_details: 'Client / Détails',
        no_transactions_found: 'Aucune transaction trouvée',
        general_statement: 'Général',
        sale_invoice: 'Facture de vente',
        purchase_invoice: 'Facture d\'achat',
        operational_expense: 'Frais Op.',
        sale_return: 'Retour Vente',

        // Debts Page
        debts_summary: 'Suivi des obligations financières',
        due_to_us: 'À nous',
        due_by_us: 'À payer',
        to_us: 'À nous',
        to_pay: 'À payer',
        no_debt_records: 'Aucun enregistrement de dette',
        register_payment: 'Enregistrer paiement',
        payment_amount: 'Montant du paiement',
        confirm_save: 'Confirmer',
        operation_success: 'Opération réussie ✨',
        payment_recorded_success: 'Le paiement a été enregistré avec succès',
        operation_failed: 'Paiement échoué ❌',
        payment_recorded_failed: 'Erreur lors de l’enregistrement du paiement',
        solde_restant: 'Solde restant',

        // Notifications
        new: 'Nouveau',
        new_activity: 'Nouvelle activité',
        new_sales_invoice: 'Nouvelle facture de vente ajoutée',
        stock_alert: 'Alerte stock',
        tax_rate: 'Taux de taxe (%)',
    }
};

// Helper: read language from localStorage synchronously (safe for SSR)
function getInitialLang() {
    if (typeof window === 'undefined') return 'ar';
    const saved = localStorage.getItem('lang');
    if (saved === 'ar' || saved === 'fr') return saved;
    localStorage.setItem('lang', 'ar');
    return 'ar';
}

export const LanguageProvider = ({ children }) => {
    // Read from localStorage synchronously — no flash, no useEffect delay
    const [lang, setLangState] = useState(getInitialLang);

    // Apply HTML attributes on first render and whenever lang changes
    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    const [pdfPreview, setPdfPreview] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Override window.print to use native Electron print ONLY if silent is requested
    useEffect(() => {
        if (typeof window !== 'undefined' && !window._printOverridden) {
            const originalPrint = window.print;
            window.print = async (options) => {
                // If silent printing is explicitly requested, use Electron's native print API to bypass dialog
                if (options && options.silent && window.electronAPI && window.electronAPI.print) {
                    try {
                        const result = await window.electronAPI.print({ ...options, printBackground: true });
                        if (!result.success) {
                            console.warn('Native silent print failed, falling back to browser print:', result.error);
                            originalPrint();
                        }
                    } catch (err) {
                        console.error('Electron print failed, falling back', err);
                        originalPrint();
                    }
                } else if (window.electronAPI && window.electronAPI.printToPDF) {
                    // For non-silent Electron prints, generate a PDF and show it in our custom preview modal!
                    try {
                        setIsGeneratingPdf(true);
                        // Give the DOM a tiny bit of time to ensure print-specific CSS is ready
                        setTimeout(async () => {
                            const pdfResult = await window.electronAPI.printToPDF({ printBackground: true });
                            if (pdfResult.success) {
                                setPdfPreview(pdfResult.data);
                            } else {
                                console.error('Failed to generate PDF:', pdfResult.error);
                                originalPrint(); // Fallback
                            }
                            setIsGeneratingPdf(false);
                        }, 50);
                    } catch (e) {
                        console.error(e);
                        setIsGeneratingPdf(false);
                        originalPrint();
                    }
                } else {
                    // For normal web environment
                    originalPrint();
                }
            };
            window._printOverridden = true;
        }
    }, []);

    const toggleLang = useCallback((newLang) => {
        if (newLang !== 'ar' && newLang !== 'fr') return;
        setLangState(newLang);
        localStorage.setItem('lang', newLang);
        // Update DOM immediately (useEffect will also run, but this avoids any delay)
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    }, []);

    const toLatinNumerals = (str) => {
        if (str === null || str === undefined) return '';
        const s = str.toString();
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        const latinDigits = '0123456789';
        return s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => latinDigits[arabicDigits.indexOf(d)]);
    };

    const fmtNumber = useCallback((num, options = {}) => {
        const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR';
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            ...options
        }).format(num || 0);
        return toLatinNumerals(formatted);
    }, [lang]);

    const fmtDate = useCallback((date, options = {}) => {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR';
        const formatted = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            ...options
        }).format(d);
        return toLatinNumerals(formatted);
    }, [lang]);

    const fmtTime = useCallback((date, options = {}) => {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        const locale = lang === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR';
        const formatted = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            ...options
        }).format(d);
        return toLatinNumerals(formatted);
    }, [lang]);

    const t = useCallback((key) => {
        return translations[lang]?.[key] || translations['ar']?.[key] || key;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t, fmtNumber, fmtDate, fmtTime, isRTL: lang === 'ar' }}>
            <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={lang === 'ar' ? 'font-arabic' : 'font-sans'}>
                {children}
            </div>

            {/* Print Loading Overlay */}
            {isGeneratingPdf && (
                <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-700 font-bold">{lang === 'ar' ? 'جاري تجهيز الفاتورة للطباعة...' : 'Préparation de la facture...'}</p>
                    </div>
                </div>
            )}

            {/* Custom Print Preview Modal for Electron */}
            {pdfPreview && (
                <div className="fixed inset-0 z-[99999] bg-slate-900 flex flex-col">
                    {/* Toolbar */}
                    <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            {lang === 'ar' ? 'معاينة الطباعة المتقدمة' : 'Aperçu avant impression'}
                        </h2>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setPdfPreview(null)}
                                className="px-6 py-2 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors"
                            >
                                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                            </button>
                            <button 
                                onClick={async () => {
                                    if (window.electronAPI && window.electronAPI.print) {
                                        await window.electronAPI.print({ silent: false, printBackground: true });
                                        setPdfPreview(null);
                                    }
                                }}
                                className="px-8 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                {lang === 'ar' ? 'طباعة عبر نظام ويندوز' : 'Imprimer (Système)'}
                            </button>
                        </div>
                    </div>
                    {/* PDF Viewer */}
                    <div className="flex-1 p-8 overflow-hidden flex justify-center bg-slate-900">
                        <iframe 
                            src={`data:application/pdf;base64,${pdfPreview}`} 
                            className="w-full max-w-5xl h-full rounded-xl shadow-2xl bg-white"
                            title="Print Preview"
                        />
                    </div>
                </div>
            )}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
