const axios = require('axios');
const ConfigService = require('./configService');

class OmoCaptchaService {
    constructor() {
        this.configService = new ConfigService();
        const config = this.configService.getServiceConfig('omoCaptcha');
        this.apiKey = (config && config.apiKey) || '';
        // Nếu config.baseUrl đã có /v2 thì dùng luôn, nếu chưa thì thêm /v2
        if (config && config.baseUrl) {
            this.baseUrl = config.baseUrl.endsWith('/v2') ? config.baseUrl : config.baseUrl + '/v2';
        } else {
            this.baseUrl = 'https://api.omocaptcha.com/v2';
        }
    }

    // Chuyển ảnh từ URL sang base64
    async imageUrlToBase64(imageUrl) {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(response.data, 'binary');
        return buffer.toString('base64');
    }

    // Gửi yêu cầu tạo task Captcha từ URL (cũ)
    async createCaptchaTask(imageUrl, widthView, heightView) {
        const imageBase64 = await this.imageUrlToBase64(imageUrl);
        return this.createCaptchaTaskFromBase64(imageBase64, widthView, heightView);
    }

    // Gửi yêu cầu tạo task Captcha từ base64 (mới)
    async createCaptchaTaskFromBase64(imageBase64, widthView, heightView) {
        const payload = {
            clientKey: this.apiKey,
            task: {
                type: 'Tiktok3DSelectObjectWebTask',
                imageBase64,
                widthView,
                heightView
            }
        };

        const res = await axios.post(`${this.baseUrl}/createTask`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const data = res.data;
        if (data.errorId !== 0) {
            throw new Error(`CreateTask failed: ${JSON.stringify(data)}`);
        }

        return data.taskId;
    }

    // Lấy kết quả giải Captcha
    async getTaskResult(taskId, retry = 20, delayMs = 3000) {
        const payload = {
            clientKey: this.apiKey,
            taskId
        };

        for (let i = 0; i < retry; i++) {
            const res = await axios.post(`${this.baseUrl}/getTaskResult`, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            const data = res.data;
            if (data.errorId !== 0) throw new Error(`TaskResult failed: ${JSON.stringify(data)}`);

            if (data.status === 'ready') return data.solution;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('Timeout waiting for captcha solution');
    }
}

module.exports = OmoCaptchaService;