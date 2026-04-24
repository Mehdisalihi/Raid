import { useState, useEffect, createContext, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const getSavedData = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      if (!item || item === 'undefined' || item === 'null') return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error parsing localStorage item \${key}:`, error);
      return defaultValue;
    }
  };

  const [products, setProducts] = useState(getSavedData('products', []));
  const [customers, setCustomers] = useState(getSavedData('customers', []));
  const [invoices, setInvoices] = useState(getSavedData('invoices', []));
  const [sales, setSales] = useState(getSavedData('sales', []));
  const [expenses, setExpenses] = useState(getSavedData('expenses', []));
  const [returns, setReturns] = useState(getSavedData('returns', []));
  const [purchases, setPurchases] = useState(getSavedData('purchases', []));
  const [inventoryMovements, setInventoryMovements] = useState(getSavedData('inventoryMovements', []));
  const [mruProducts, setMruProducts] = useState(getSavedData('mruProducts', []));
  const [users, setUsers] = useState(getSavedData('users', [
    { id: 1, username: 'admin', password: 'admin123', name: 'Admin' }
  ]));
  const [currentUser, setCurrentUser] = useState(getSavedData('currentUser', null));
  const [activePage, setActivePage] = useState('dashboard');
  const [invoiceMode, setInvoiceMode] = useState('debt'); // 'debt' or 'purchases'
  const [salesMode, setSalesMode] = useState('daily'); // 'daily' or 'custom'

  const [debts, setDebts] = useState(getSavedData('debts', []));
  const [credits, setCredits] = useState(getSavedData('credits', []));
  const [settings, setSettings] = useState(getSavedData('settings', {
    businessName: 'Smart Accountant',
    phone: '4000 0000',
    address: 'Nouakchott, Mauritania',
    currency: 'MRU',
    logo: ''
  }));
  const [language, setLanguage] = useState(getSavedData('language', 'ar'));
  const [dir, setDir] = useState(getSavedData('dir', 'rtl'));
  const [theme, setTheme] = useState(getSavedData('theme', 'light'));

  // Initialize lang & theme on load
  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    const initialLang = storedLang ? JSON.parse(storedLang) : 'ar';
    const initialDir = initialLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = initialDir;
    document.documentElement.lang = initialLang;
    setLanguage(initialLang);
    setDir(initialDir);

    const storedTheme = localStorage.getItem('theme');
    const initialTheme = storedTheme ? JSON.parse(storedTheme) : 'light';
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []); // Run once on mount

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('invoices', JSON.stringify(invoices));
    localStorage.setItem('sales', JSON.stringify(sales));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('returns', JSON.stringify(returns));
    localStorage.setItem('purchases', JSON.stringify(purchases));
    localStorage.setItem('inventoryMovements', JSON.stringify(inventoryMovements));
    localStorage.setItem('mruProducts', JSON.stringify(mruProducts));
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('debts', JSON.stringify(debts));
    localStorage.setItem('credits', JSON.stringify(credits));
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [products, customers, invoices, sales, expenses, returns, purchases, inventoryMovements, mruProducts, users, currentUser, debts, credits, settings]);

  const addProduct = (product) => {
    const code = String(product.code).trim();
    const existingIndex = products.findIndex(p => p.code.toLowerCase() === code.toLowerCase());

    if (existingIndex > -1) {
      // Upsert: Update existing product instead of duplicating
      const existing = products[existingIndex];
      const newQty = (existing.quantity || 0) + (parseInt(product.quantity) || 0);
      updateProduct(existing.id, { ...product, quantity: newQty });
      return;
    }

    const newProduct = { ...product, code, id: Date.now() };
    setProducts([...products, newProduct]);
    if (newProduct.quantity > 0) {
      addMovement(newProduct.id, newProduct.name, newProduct.quantity, 'adjustment', 'initial', 'Initial Stock');
    }
  };
  const updateProduct = (id, updated, skipMovement = false) => {
    const prev = products.find(p => p.id === id);
    if (!skipMovement && prev && updated.quantity !== undefined && updated.quantity !== prev.quantity) {
      const diff = updated.quantity - prev.quantity;
      addMovement(id, prev.name, diff, 'adjustment', 'manual', 'Manual Adjustment');
    }
    setProducts(products.map(p => p.id === id ? { ...p, ...updated } : p));
  };
  const deleteProduct = (id) => setProducts(products.filter(p => p.id !== id));

  const bulkAddProducts = (newProducts) => {
    setProducts(prev => {
      const updatedProducts = [...prev];

      newProducts.forEach(p => {
        if (!p.code || !p.name) return;

        const code = String(p.code).trim();
        const price = Math.max(0, parseFloat(p.price) || 0);
        const purchasePrice = Math.max(0, parseFloat(p.purchasePrice) || 0);
        const quantity = Math.max(0, parseInt(p.quantity) || 0);
        const minThreshold = Math.max(0, parseInt(p.minThreshold) || 5);

        let margin = p.margin || 0;
        if (purchasePrice > 0 && price > 0) {
          margin = ((price - purchasePrice) / purchasePrice) * 100;
        }

        const existingIndex = updatedProducts.findIndex(item => String(item.code).trim().toLowerCase() === code.toLowerCase());

        const productData = {
          ...p,
          code: code,
          name: String(p.name).trim(),
          quantity: quantity,
          price: price,
          purchasePrice: purchasePrice,
          minThreshold: minThreshold,
          margin: parseFloat(parseFloat(margin).toFixed(2)),
          category: p.category || 'catGeneral',
          updatedAt: new Date().toISOString()
        };

        if (existingIndex > -1) {
          // Update existing: Sum quantities if both are provided differently or just update
          updatedProducts[existingIndex] = { ...updatedProducts[existingIndex], ...productData };
        } else {
          // Add new
          updatedProducts.push({
            ...productData,
            id: Date.now() + Math.random()
          });
        }
      });

      return updatedProducts;
    });
  };

  const deduplicateProducts = () => {
    setProducts(prev => {
      const map = new Map();
      prev.forEach(p => {
        const code = String(p.code).trim().toLowerCase();
        if (map.has(code)) {
          const existing = map.get(code);
          // Merge logic: Combine quantity, keep newest name/prices
          map.set(code, {
            ...p,
            id: existing.id, // Keep old ID
            quantity: (existing.quantity || 0) + (p.quantity || 0),
            // Prices could be averaged or taken from the "newer" one. Let's take p (newer in sequence)
          });
        } else {
          map.set(code, { ...p });
        }
      });
      return Array.from(map.values());
    });
    alert(language === 'ar' ? 'تم دمج المنتجات المكررة بنجاح' : 'Duplicate products merged successfully');
  };
  const deleteAllProducts = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف جميع المنتجات؟ لا يمكن التراجع عن هذه العملية.' : 'Are you sure you want to delete all products? This action cannot be undone.')) {
      setProducts([]);
      setInventoryMovements([]);
    }
  };

  const addCustomer = (customer) => setCustomers([...customers, { ...customer, id: Date.now() }]);
  const updateCustomer = (id, updated) => setCustomers(customers.map(c => c.id === id ? { ...c, ...updated } : c));
  const deleteCustomer = (id) => setCustomers(customers.filter(c => c.id !== id));

  const addExpense = (expense) => setExpenses([...expenses, { ...expense, id: Date.now() }]);
  const updateExpense = (id, updated) => setExpenses(expenses.map(e => e.id === id ? { ...e, ...updated } : e));
  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));

  const addMovement = (productId, productName, quantityChange, type, referenceId, notes = '') => {
    const p = products.find(prod => prod.id === productId);
    const newStock = p ? p.quantity + quantityChange : quantityChange;
    setInventoryMovements(prev => [{
      id: Date.now() + Math.random(),
      productId,
      productName,
      quantityChange,
      type,
      referenceId,
      notes,
      date: new Date().toISOString(),
      newStock
    }, ...prev].slice(0, 500)); // Keep last 500
  };

  const addInvoice = (invoice) => {
    const id = Date.now() + Math.random();
    const newInvoice = {
      ...invoice,
      id,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      paymentMethod: invoice.paymentMethod || (invoice.isDebt ? 'debt' : 'cash')
    };
    setInvoices([...invoices, newInvoice]);
    setSales([...sales, newInvoice]);

    // If it's a debt (simulated by non-cash or explicit debt flag)
    if (invoice.isDebt) {
      setDebts(prev => [...prev, {
        id: Date.now() + 1,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: id, // Link to the source invoice
        amount: invoice.total,
        remaining: invoice.total,
        date: invoice.date
      }]);
    }

    // Update inventory using functional update to avoid stale closure
    invoice.items.forEach(item => {
      setProducts(prev => {
        const updated = prev.map(p => {
          if (p.id === item.productId || p.id === item.id) {
            const newQty = (p.quantity || 0) - item.quantity;
            addMovement(p.id, p.name, -item.quantity, 'sale', invoice.invoiceNumber);
            return { ...p, quantity: Math.max(0, newQty) };
          }
          return p;
        });
        return updated;
      });
    });
  };

  const deleteInvoice = (id) => {
    const inv = invoices.find(i => i.id === id);
    setInvoices(invoices.filter(i => i.id !== id));
    setSales(prev => prev.filter(s => s.id !== id));
    // Restore inventory using functional update
    if (inv && inv.items) {
      inv.items.forEach(item => {
        setProducts(prev => prev.map(p => {
          if (p.id === item.productId || p.id === item.id) {
            return { ...p, quantity: (p.quantity || 0) + item.quantity };
          }
          return p;
        }));
      });
    }
  };

  const updateInvoice = (id, updated) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const processReturn = (returnData) => {
    const newReturn = { ...returnData, id: Date.now(), date: new Date().toISOString().split('T')[0] };
    setReturns([...returns, newReturn]);

    // Update inventory (return items to stock)
    returnData.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId || prod.id === item.id);
      if (p) {
        updateProduct(p.id, { quantity: p.quantity + item.quantity }, true);
        addMovement(p.id, p.name, item.quantity, 'return', returnData.id);
      }
    });
  };

  const addPurchase = (purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    setPurchases([...purchases, newPurchase]);

    // Update inventory (increase stock)
    purchase.items.forEach(item => {
      const p = products.find(prod => prod.id === item.id || prod.id === item.productId);
      if (p) {
        updateProduct(p.id, { quantity: p.quantity + item.quantity }, true);
        addMovement(p.id, p.name, item.quantity, 'purchase', newPurchase.id);
      }
    });

    // Record debt to Creditor (Dainin) - Always as debt per user request
    addCredit({
      entityName: purchase.supplierName,
      amount: purchase.total,
      date: purchase.date || new Date().toISOString().split('T')[0],
      notes: purchase.notes || `Purchase Invoice #\${newPurchase.id}`,
      purchaseId: newPurchase.id // Link to the source purchase
    });
  };

  const deletePurchase = (id) => {
    const purchase = purchases.find(p => p.id === id);
    if (purchase && purchase.items) {
      // Restore inventory (subtract quantities added by purchase)
      purchase.items.forEach(item => {
        setProducts(prev => prev.map(p => {
          if (p.id === item.productId || p.id === item.id) {
            return { ...p, quantity: Math.max(0, (p.quantity || 0) - item.quantity) };
          }
          return p;
        }));
      });
    }
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  const addToMRU = (productId) => {
    const updated = [productId, ...mruProducts.filter(id => id !== productId)].slice(0, 10);
    setMruProducts(updated);
  };

  const login = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const loginGuest = () => {
    const guestUser = { id: 'guest', username: 'guest', name: 'زائر', role: 'guest' };
    setCurrentUser(guestUser);
    return true;
  };

  const logout = () => setCurrentUser(null);

  const addCredit = (credit) => setCredits(prev => [...prev, { ...credit, id: Date.now() }]);
  const deleteCredit = (id) => {
    const cred = credits.find(c => c.id === id);
    if (cred && cred.purchaseId) {
      deletePurchase(cred.purchaseId);
    }
    setCredits(prev => prev.filter(c => c.id !== id));
  };
  const editCredit = (id, updatedCredit) => setCredits(credits.map(c => c.id === id ? { ...c, ...updatedCredit } : c));

  const updateDebt = (id, amount) => setDebts(debts.map(d => d.id === id ? { ...d, remaining: d.remaining - amount } : d));
  const deleteDebt = (id) => {
    const debt = debts.find(d => d.id === id);
    if (debt && debt.invoiceId) {
      deleteInvoice(debt.invoiceId);
    }
    setDebts(prev => prev.filter(d => d.id !== id));
  };
  const editDebt = (id, updatedDebt) => setDebts(debts.map(d => d.id === id ? { ...d, ...updatedDebt } : d));

  const updateSettings = (newSettings) => setSettings({ ...settings, ...newSettings });

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'fr' : 'ar';
    const newDir = newLang === 'ar' ? 'rtl' : 'ltr';
    setLanguage(newLang);
    setDir(newDir);
    localStorage.setItem('language', JSON.stringify(newLang));
    localStorage.setItem('dir', JSON.stringify(newDir));
    document.documentElement.dir = newDir;
    document.documentElement.lang = newLang;
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
    document.documentElement.dataset.theme = newTheme;
  };

  return (
    <AppContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct, bulkAddProducts, deleteAllProducts, deduplicateProducts,
      customers, addCustomer, updateCustomer, deleteCustomer,
      invoices, addInvoice, deleteInvoice, updateInvoice,
      sales,
      expenses, addExpense, updateExpense, deleteExpense,
      returns, processReturn,
      purchases, addPurchase, deletePurchase,
      inventoryMovements,
      mruProducts, addToMRU,
      users, login, loginGuest, logout,
      currentUser,
      activePage, setActivePage,
      invoiceMode, setInvoiceMode,
      salesMode, setSalesMode,
      debts, updateDebt, deleteDebt, editDebt,
      credits, addCredit, deleteCredit, editCredit,
      settings, updateSettings,
      language, toggleLanguage, dir,
      theme, toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => useContext(AppContext);
