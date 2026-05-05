const { app, BrowserWindow, session, ipcMain, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Mohassibe Accounting System',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Set User Agent to something standard to avoid being blocked
  session.defaultSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Mohassibe/1.0.0');

  // Load the web app which has the offline synchronization logic
  mainWindow.loadURL('https://mohassibe.vercel.app');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: 'عن محاسب', click: showAboutDialog },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'إنهاء' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'ملف (File)',
      submenu: [
        { label: 'تحديث الصفحة', role: 'reload' },
        { label: 'فرض التحديث', role: 'forceReload' },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'إغلاق' } : { role: 'quit', label: 'خروج' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'تعديل (Edit)',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' }
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'عرض (View)',
      submenu: [
        { role: 'resetZoom', label: 'استعادة الحجم الطبيعي' },
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'أدوات المطور' }
      ]
    },
    // Help / About Menu
    {
      label: 'مساعدة (Help)',
      submenu: [
        {
          label: 'معلومات المطور (About Developer)',
          click: showAboutDialog
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'معلومات المطور | Developer Info',
    message: 'Mohassibe Accounting System - نظام محاسب',
    detail: `الإصدار (Version): 1.0.0\n\nتطوير المهندس: المهدي صلوحي (Mehdi Salihi)\n\nمنصة متطورة لإدارة الحسابات والمخازن ونقاط البيع مع دعم كامل للعمل بدون إنترنت (Offline-First).\n\n© ${new Date().getFullYear()} Raid. All rights reserved.`,
    buttons: ['موافق (OK)'],
    icon: path.join(__dirname, 'build', 'icon.png')
  });
}

// Setup IPC handlers for printing
function setupIpcHandlers() {
  ipcMain.handle('get-printers', async (event) => {
    return await event.sender.getPrintersAsync();
  });

  ipcMain.handle('print', async (event, options = {}) => {
    return new Promise((resolve, reject) => {
      // options can include silent: true, deviceName: '...', etc.
      // We default to native dialog if not silent
      const printOptions = {
        silent: options.silent || false,
        printBackground: options.printBackground !== false,
        deviceName: options.deviceName,
        color: options.color !== false,
        margins: options.margins || { marginType: 'default' },
        landscape: options.landscape || false,
        pagesPerSheet: options.pagesPerSheet || 1,
        collate: options.collate !== false,
        copies: options.copies || 1,
        header: options.header || '',
        footer: options.footer || '',
      };
      
      event.sender.print(printOptions, (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('print-to-pdf', async (event, options = {}) => {
    try {
      const data = await event.sender.printToPDF(options);
      return { success: true, data: data.toString('base64') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

app.on('ready', () => {
  setupIpcHandlers();
  createWindow();
  createAppMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
