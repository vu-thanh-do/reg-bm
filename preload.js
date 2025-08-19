const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Config management
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateServiceConfig: (serviceName, config) => ipcRenderer.invoke('update-service-config', serviceName, config),
    updateApiKey: (serviceName, apiKey) => ipcRenderer.invoke('update-api-key', serviceName, apiKey),
    setServiceEnabled: (serviceName, enabled) => ipcRenderer.invoke('set-service-enabled', serviceName, enabled),
    resetConfig: () => ipcRenderer.invoke('reset-config'),

    // Service operations
    testService: (serviceName) => ipcRenderer.invoke('test-service', serviceName),

    // Start automation with user config
    startAutomation: (userConfig) => ipcRenderer.invoke('start-automation', userConfig),
    stopAutomation: () => ipcRenderer.invoke('stop-automation'),

    // Chọn đường dẫn lưu Excel
    chooseExcelPath: () => ipcRenderer.invoke('choose-excel-path'),

    // Lấy thống kê backup
    getBackupStats: () => ipcRenderer.invoke('get-backup-stats'),

    // Export backup sang Excel
    exportBackupToExcel: (excelPath) => ipcRenderer.invoke('export-backup-to-excel', excelPath),

    // Nhận kết quả reg từ main process
    onRegResult: (callback) => ipcRenderer.on('reg-result', callback)
});