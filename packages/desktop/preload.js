const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    print: (options) => ipcRenderer.invoke('print', options),
    printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options)
});
