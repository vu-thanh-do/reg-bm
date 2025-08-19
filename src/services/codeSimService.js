const axios = require('axios');
const ConfigService = require('./configService');

class ViotpService {
    constructor() {
        this.configService = new ConfigService();
        const config = this.configService.getServiceConfig('viotp');
        this.token = (config && config.apiKey) || '';
        this.baseUrl = (config && config.baseUrl) || 'https://api.viotp.com';
        this.serviceId = 29;
    }

    // Lấy số điện thoại, retry đến khi thành công
    async getPhoneNumber(retry = 20, delayMs = 3000) {
        for (let i = 0; i < retry; i++) {
            try {
                const url = `${this.baseUrl}/request/getv2?token=d306d67ac4224b72aa9bd268de771eb7&serviceId=${this.serviceId}`;
                const res = await axios.get(url);
                const data = res.data;
                console.log(data)
                if (data.success && data.status_code === 200 && data.data) {
                    return {
                        phone: data.data.phone_number,
                        phoneOriginal: data.data.re_phone_number,
                        requestId: data.data.request_id,
                        countryCode: data.data.countryCode,
                        countryISO: data.data.countryISO
                    };
                } else {
                    // Nếu lỗi do hết số thì retry
                    if (data.status_code === -3) {
                        await new Promise(r => setTimeout(r, delayMs));
                        continue;
                    } else {
                        throw new Error(data.message || 'Lỗi không xác định khi lấy số');
                    }
                }
            } catch (err) {
                // Retry nếu lỗi mạng
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        throw new Error('Không lấy được số điện thoại từ Viotp sau nhiều lần thử');
    }

    // Lấy OTP theo requestId, nếu chưa có thì trả về null
    async getOtpByRequestId(requestId) {
        try {
            const url = `${this.baseUrl}/session/getv2?requestId=${requestId}&token=d306d67ac4224b72aa9bd268de771eb7`;
            const res = await axios.get(url);
            const data = res.data;
            if (data.success && data.status_code === 200 && data.data) {
                if (data.data.Code) {
                    return {
                        code: data.data.Code,
                        smsContent: data.data.SmsContent,
                        phone: data.data.PhoneOriginal
                    };
                } else {
                    // Chưa có OTP
                    return null;
                }
            } else {
                throw new Error(data.message || 'Lỗi không xác định khi lấy OTP');
            }
        } catch (err) {
            // Nếu lỗi mạng hoặc chưa có OTP thì trả về null
            return null;
        }
    }
}

module.exports = ViotpService;