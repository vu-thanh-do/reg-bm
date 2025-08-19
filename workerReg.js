const { parentPort, workerData } = require('worker_threads');
const { runRegisterJob } = require('./src/regJob');

(async() => {
    const userConfig = workerData.userConfig;
    try {
        const result = await runRegisterJob(userConfig);
        parentPort.postMessage(result);
    } catch (err) {
        parentPort.postMessage({
            email: '',
            password: '',
            status: 'Error',
            message: err.message
        });
    }
})();