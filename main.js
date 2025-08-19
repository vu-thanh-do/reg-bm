const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ConfigService = require('./src/services/configService');
const MailTmService = require('./src/services/mailTmService');
const InboxesService = require('./src/services/inboxesService');
const TmailorService = require('./src/services/tmailorService');
const Hunght1890Service = require('./src/services/hunght1890Service');
const fs = require('fs');
const urlConfig = require('./config/config.js');
const { Worker } = require('worker_threads');
const XLSX = require('xlsx');

let configService;

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        frame: false, // Ẩn title bar mặc định
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, './assets/icon.png')
    });

    win.loadFile(path.join(__dirname, 'src/views/index.html'));

    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    // Window controls
    ipcMain.on('window-minimize', () => win.minimize());
    ipcMain.on('window-maximize', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });
    ipcMain.on('window-close', () => win.close());

    // Chọn đường dẫn lưu Excel
    ipcMain.handle('choose-excel-path', async() => {
        const { filePath } = await dialog.showSaveDialog(win, {
            title: 'Chọn nơi lưu file Excel',
            defaultPath: 'reg-tiktok.xlsx',
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        return filePath || '';
    });

    // Config management handlers
    ipcMain.handle('get-config', async() => {
        try {
            return { success: true, config: configService.getAllConfig() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-service-config', async(event, serviceName, config) => {
        try {
            const result = configService.updateServiceConfig(serviceName, config);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-api-key', async(event, serviceName, apiKey) => {
        try {
            const result = configService.updateApiKey(serviceName, apiKey);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-service-enabled', async(event, serviceName, enabled) => {
        try {
            const result = configService.setServiceEnabled(serviceName, enabled);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('reset-config', async() => {
        try {
            const result = configService.resetConfig();
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Service test handlers
    ipcMain.handle('test-service', async(event, serviceName) => {
        try {
            let service;
            switch (serviceName) {
                case 'mailTm':
                    service = new MailTmService();
                    if (!service.isEnabled()) {
                        return { success: false, error: 'Service is disabled' };
                    }
                    // Test bằng cách lấy domain (nếu có) hoặc tạo email test
                    const emailResult = await service.generateRandomEmail();
                    return { success: true, message: 'Service is working', email: emailResult };

                case 'inboxes':
                    service = new InboxesService();
                    if (!service.isEnabled()) {
                        return { success: false, error: 'Service is disabled' };
                    }
                    const inboxResult = await service.createInbox();
                    return { success: true, message: 'Service is working', result: inboxResult };

                case 'hunght189':
                    service = new Hunght1890Service();
                    if (!service.isEnabled()) {
                        return { success: false, error: 'Service is disabled' };
                    }
                    const hunghtResult = await service.createEmail();
                    return { success: true, message: 'Service is working', result: hunghtResult };

                case 'tmailor':
                    service = new TmailorService();
                    if (!service.isEnabled()) {
                        return { success: false, error: 'Service is disabled' };
                    }
                    const domainsResult = await service.getDomains();
                    return { success: true, message: 'Service is working', result: domainsResult };

                default:
                    return { success: false, error: 'Unknown service' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Nhận userConfig và khởi tạo worker threads cho automation
    ipcMain.handle('start-automation', async(event, userConfig) => {
        try {
            const threadCount = userConfig.threadCount || 1;
            const excelPath = userConfig.excelPath || '';
            const proxyList = Array.isArray(userConfig.proxyList) ? userConfig.proxyList : [];
            const results = [];
            let isStopped = false;
            let runningWorkers = 0;

            // Lưu lại hàm để dừng automation từ renderer
            global.stopAutomation = () => { isStopped = true; };

            // Hàm khởi tạo worker mới
            const startWorker = (workerIndex) => {
                if (isStopped) return;
                runningWorkers++;
                // Lấy proxy quay vòng
                let proxy = '';
                if (proxyList.length > 0) {
                    proxy = proxyList[workerIndex % proxyList.length];
                }
                const workerUserConfig = {...userConfig, proxy };
                const worker = new Worker(path.join(__dirname, 'workerReg.js'), {
                    workerData: { userConfig: workerUserConfig }
                });
                worker.on('message', (result) => {
                    if (result.status === 'Success') {
                        results.push(result);
                        event.sender.send('reg-result', result);
                    }

                    // Chỉ lưu Excel khi thực sự Success và hoàn thành bcHandler/bcAgencyHandler
                    if (excelPath && result.status === 'Success' && result.bcProcessCompleted === true) {
                        // Lưu backup cho trường hợp thành công hoàn chỉnh
                        try {
                            const BackupLogic = require('./backup-logic.js');
                            const backup = new BackupLogic();
                            backup.saveSuccessfulAccount(result);
                        } catch (backupError) {
                            console.error('❌ Lỗi backup:', backupError.message);
                        }
                        try {
                            const backupPath = excelPath + '.backup';
                            let wb, ws, data = [];

                            // Backup file cũ trước khi ghi (nếu tồn tại)
                            if (fs.existsSync(excelPath)) {
                                fs.copyFileSync(excelPath, backupPath);
                                wb = XLSX.readFile(excelPath);

                                // Đọc từ sheet 'Results' thay vì sheet đầu tiên
                                if (wb.Sheets['Results']) {
                                    data = XLSX.utils.sheet_to_json(wb.Sheets['Results']);
                                } else if (wb.SheetNames.length > 0) {
                                    // Fallback: đọc từ sheet đầu tiên nếu không có sheet 'Results'
                                    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                                }
                            } else {
                                wb = XLSX.utils.book_new();
                            }

                            // Thêm record mới vào cuối
                            data.push(result);

                            // Tạo sheet mới và GHI ĐÈ sheet 'Results'
                            ws = XLSX.utils.json_to_sheet(data);
                            wb.Sheets['Results'] = ws; // ✅ GHI ĐÈ thay vì append

                            // Đảm bảo 'Results' có trong SheetNames
                            if (!wb.SheetNames.includes('Results')) {
                                wb.SheetNames = ['Results']; // Đặt 'Results' làm sheet duy nhất
                            } else {
                                // Nếu đã có 'Results', đưa nó lên đầu
                                wb.SheetNames = wb.SheetNames.filter(name => name !== 'Results');
                                wb.SheetNames.unshift('Results');
                            }

                            // Ghi file Excel
                            XLSX.writeFile(wb, excelPath);

                            // Xóa backup nếu ghi thành công
                            if (fs.existsSync(backupPath)) {
                                fs.unlinkSync(backupPath);
                            }

                            console.log(`✅ Excel: Đã lưu ${data.length} records vào ${excelPath}`);

                        } catch (err) {
                            console.error('❌ Lỗi ghi file Excel:', err);

                            // Khôi phục từ backup nếu có lỗi
                            const backupPath = excelPath + '.backup';
                            if (fs.existsSync(backupPath)) {
                                try {
                                    fs.copyFileSync(backupPath, excelPath);
                                    console.log('✅ Đã khôi phục Excel từ backup');
                                } catch (restoreErr) {
                                    console.error('❌ Không thể khôi phục backup:', restoreErr);
                                }
                            }
                        }
                    } else if (result.status === 'Success' && !result.bcProcessCompleted) {
                        console.log('⚠️ BC Setup hoàn tất nhưng chưa hoàn thành bcHandler/bcAgencyHandler');
                        console.log('❌ Không lưu Excel và backup (chưa hoàn thành)');
                    } else if (result.status !== 'Success') {
                        console.log('❌ Process thất bại - không lưu Excel và backup');
                        console.log('📝 Status:', result.status, 'Message:', result.message);
                    }

                    runningWorkers--;
                    if (!isStopped) {
                        startWorker(workerIndex); // Luôn duy trì số luồng
                    }
                });
                worker.on('error', (err) => {
                    event.sender.send('reg-result', { email: '', password: '', status: 'Error', message: err.message });
                    runningWorkers--;
                    if (!isStopped) {
                        startWorker(workerIndex); // Luôn duy trì số luồng
                    }
                });
            };

            // Khởi tạo pool
            for (let i = 0; i < threadCount; i++) {
                startWorker(i);
            }

            // Trả về promise không resolve cho đến khi user dừng
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (isStopped && runningWorkers === 0) {
                        clearInterval(checkInterval);
                        resolve({ success: true, results });
                    }
                }, 1000);
            });
        } catch (error) {
            console.error('Lỗi automation:', error);
            return { success: false, error: error.message };
        }
    });

    // Thêm handler cho stop-automation
    ipcMain.handle('stop-automation', async() => {
        if (global.stopAutomation) global.stopAutomation();
        return { success: true };
    });

    // Handler backup stats
    ipcMain.handle('get-backup-stats', async() => {
        try {
            const BackupLogic = require('./backup-logic.js');
            const backup = new BackupLogic();
            const stats = backup.getBackupStats();
            return { success: true, stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Handler export backup to Excel
    ipcMain.handle('export-backup-to-excel', async(event, excelPath) => {
        try {
            const BackupLogic = require('./backup-logic.js');
            const backup = new BackupLogic();
            const result = backup.exportToExcel(excelPath);
            return { success: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

app.whenReady().then(() => {
    // Khởi tạo ConfigService
    configService = new ConfigService();

    createWindow();

    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});