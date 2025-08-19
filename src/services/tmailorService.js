const axios = require('axios');
const ConfigService = require('./configService');

class TmailorService {
    constructor() {
        this.configService = new ConfigService();
        this.loadConfig();
    }

    loadConfig() {
        const config = this.configService.getServiceConfig('tmailor');
        if (config) {
            this.apiKey = config.apiKey || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlIjoicHprS1pKNVhFVU1QcTFWMEphcTBaSXlESTNJaklVeXlHSGc0cXhXMkkzeW5ISEVkRHlTam54a2dHM0lBcTAxNkdJRVZaSFNVcFFPbm9JcTNESVNDckhrM0h3SVpxMUE0RHhNS0tCS0FJSndJUEhLeWcifQ.jGXv2ZyQI_zVfI2dem3P2qDXcQvhw3YVaHU7Kt36sLU';
            this.baseUrl = config.baseUrl || 'https://api.tmailor.com/api/v1';
        } else {
            this.apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlIjoicHprS1pKNVhFVU1QcTFWMEphcTBaSXlESTNJaklVeXlHSGc0cXhXMkkzeW5ISEVkRHlTam54a2dHM0lBcTAxNkdJRVZaSFNVcFFPbm9JcTNESVNDckhrM0h3SVpxMUE0RHhNS0tCS0FJSndJUEhLeWcifQ.jGXv2ZyQI_zVfI2dem3P2qDXcQvhw3YVaHU7Kt36sLU';
            this.baseUrl = 'https://api.tmailor.com/api/v1';
        }
    }

    // Reload config khi có thay đổi
    reloadConfig() {
        this.loadConfig();
    }

    // Lấy danh sách domain
    async getDomains() {
        try {
            const response = await axios.get(`${this.baseUrl}/domains`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return { success: true, domains: response.data.data };
        } catch (error) {
            return { success: false, error: (error.response && error.response.data) || error.message };
        }
    }

    // Tạo email random với domain hợp lệ
    async createEmail() {
        const domainsResult = await this.getDomains();
        if (!domainsResult.success || !domainsResult.domains.length) {
            return { success: false, error: 'No domains available' };
        }
        const domain = domainsResult.domains[0];
        const local = Math.random().toString(36).substring(2, 12);
        const email = `${local}@${domain}`;
        return { success: true, email };
    }

    // Lấy danh sách mail cho email
    async getMessages(email) {
        try {
            const response = await axios.get(`${this.baseUrl}/messages/${encodeURIComponent(email)}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return { success: true, messages: response.data.data };
        } catch (error) {
            return { success: false, error: (error.response && error.response.data) || error.message };
        }
    }

    // Đọc nội dung mail theo ID
    async getMessageContent(email, messageId) {
        try {
            const response = await axios.get(`${this.baseUrl}/messages/${encodeURIComponent(email)}/${messageId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return { success: true, message: response.data.data };
        } catch (error) {
            return { success: false, error: (error.response && error.response.data) || error.message };
        }
    }

    // Check if service is enabled
    isEnabled() {
        return this.configService.isServiceEnabled('tmailor');
    }
}

module.exports = TmailorService;