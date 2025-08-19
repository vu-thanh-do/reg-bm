const fs = require('fs');
const path = require('path');

class ConfigService {
    constructor() {
        this.configPath = path.join(__dirname, '../../config/api-keys.json');
        this.config = this.loadConfig();
    }

    // Load config từ file
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            } else {
                // Tạo file config mặc định nếu chưa có
                const defaultConfig = {
                    mailTm: {
                        enabled: true,
                        apiKey: "",
                        baseUrl: "https://api.mail.tm"
                    },
                    inboxes: {
                        enabled: true,
                        apiKey: "b7826d4496msh74147643d4d0fd2p160263jsn0a19523eae86",
                        hostname: "inboxes-com.p.rapidapi.com"
                    },
                    tmailor: {
                        enabled: true,
                        apiKey: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlIjoicHprS1pKNVhFVU1QcTFWMEphcTBaSXlESTNJaklVeXlHSGc0cXhXMkkzeW5ISEVkRHlTam54a2dHM0lBcTAxNkdJRVZaSFNVcFFPbm9JcTNESVNDckhrM0h3SVpxMUE0RHhNS0tCS0FJSndJUEhLeWcifQ.jGXv2ZyQI_zVfI2dem3P2qDXcQvhw3YVaHU7Kt36sLU",
                        baseUrl: "https://api.tmailor.com/api/v1"
                    },
                    codesim: {
                        enabled: true,
                        apiKey: "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0aGFuaGRvMjEiLCJqdGkiOiI3NTE2NyIsImlhdCI6MTc1MjczODUxNiwiZXhwIjoxODE0OTQ2NTE2fQ.-wLvTk7ILypbNTgVm5u0uJM1oLfo7EuSpRReLz6FwIjnbWKh4aedxsNrbVH_bZ83pfqKkvosJ-dLOX7aT2BwyA",
                        baseUrl: "https://apisim.codesim.net"
                    },
                    omoCaptcha: {
                        enabled: true,
                        apiKey: "OMO_WC4GFP3BWWTWSSBJENAN9GONTDJF451JIV8NSGHGBJXNFNUOIVI5OLTIQPMD4Z1752245015",
                        baseUrl: "https://api.omocaptcha.com"
                    }
                };
                this.saveConfig(defaultConfig);
                return defaultConfig;
            }
        } catch (error) {
            console.error('Error loading config:', error);
            return {};
        }
    }

    // Lưu config vào file
    saveConfig(config = null) {
        try {
            const configToSave = config || this.config;
            const configDir = path.dirname(this.configPath);

            // Tạo thư mục config nếu chưa có
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
            this.config = configToSave;
            return { success: true };
        } catch (error) {
            console.error('Error saving config:', error);
            return { success: false, error: error.message };
        }
    }

    // Lấy config của service cụ thể
    getServiceConfig(serviceName) {
        return this.config[serviceName] || null;
    }

    // Cập nhật config của service
    updateServiceConfig(serviceName, newConfig) {
        if (!this.config[serviceName]) {
            this.config[serviceName] = {};
        }

        this.config[serviceName] = {...this.config[serviceName], ...newConfig };
        return this.saveConfig();
    }

    // Lấy tất cả config
    getAllConfig() {
        return this.config;
    }

    // Kiểm tra service có được enable không
    isServiceEnabled(serviceName) {
        const serviceConfig = this.getServiceConfig(serviceName);
        return serviceConfig && serviceConfig.enabled === true;
    }

    // Enable/disable service
    setServiceEnabled(serviceName, enabled) {
        return this.updateServiceConfig(serviceName, { enabled });
    }

    // Cập nhật API key của service
    updateApiKey(serviceName, apiKey) {
        return this.updateServiceConfig(serviceName, { apiKey });
    }

    // Lấy API key của service
    getApiKey(serviceName) {
        const serviceConfig = this.getServiceConfig(serviceName);
        return serviceConfig ? serviceConfig.apiKey : null;
    }

    // Reset config về mặc định
    resetConfig() {
        const defaultConfig = {
            mailTm: {
                enabled: true,
                apiKey: "",
                baseUrl: "https://api.mail.tm"
            },
            inboxes: {
                enabled: true,
                apiKey: "b7826d4496msh74147643d4d0fd2p160263jsn0a19523eae86",
                hostname: "inboxes-com.p.rapidapi.com"
            },
            tmailor: {
                enabled: true,
                apiKey: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlIjoicHprS1pKNVhFVU1QcTFWMEphcTBaSXlESTNJaklVeXlHSGc0cXhXMkkzeW5ISEVkRHlTam54a2dHM0lBcTAxNkdJRVZaSFNVcFFPbm9JcTNESVNDckhrM0h3SVpxMUE0RHhNS0tCS0FJSndJUEhLeWcifQ.jGXv2ZyQI_zVfI2dem3P2qDXcQvhw3YVaHU7Kt36sLU",
                baseUrl: "https://api.tmailor.com/api/v1"
            },
            codesim: {
                enabled: true,
                apiKey: "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0aGFuaGRvMjEiLCJqdGkiOiI3NTE2NyIsImlhdCI6MTc1MjczODUxNiwiZXhwIjoxODE0OTQ2NTE2fQ.-wLvTk7ILypbNTgVm5u0uJM1oLfo7EuSpRReLz6FwIjnbWKh4aedxsNrbVH_bZ83pfqKkvosJ-dLOX7aT2BwyA",
                baseUrl: "https://apisim.codesim.net"
            },
            omoCaptcha: {
                enabled: true,
                apiKey: "OMO_WC4GFP3BWWTWSSBJENAN9GONTDJF451JIV8NSGHGBJXNFNUOIVI5OLTIQPMD4Z1752245015",
                baseUrl: "https://api.omocaptcha.com"
            }
        };
        return this.saveConfig(defaultConfig);
    }
}

module.exports = ConfigService;