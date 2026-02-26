/**
 * HTTP Client — 简单的 HTTP 请求封装
 * 
 * 支持: GET, POST, 请求重试, 超时控制
 * 零依赖，使用 Node.js 18+ 内置 fetch
 */

class HttpClient {
    constructor(config = {}) {
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 3;
        this.retryDelay = config.retryDelay || 1000;
        this.headers = config.headers || {
            'User-Agent': 'EarningAgent/1.0 (Genesis Framework)'
        };
    }

    /**
     * GET 请求
     */
    async get(url, options = {}) {
        return this._request(url, { ...options, method: 'GET' });
    }

    /**
     * POST 请求
     */
    async post(url, data, options = {}) {
        return this._request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }

    /**
     * 核心请求方法
     */
    async _request(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        const fetchOptions = {
            ...options,
            headers: { ...this.headers, ...options.headers },
            signal: controller.signal
        };

        let lastError;
        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                let data;
                if (contentType?.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                return { success: true, data, status: response.status };
            } catch (error) {
                lastError = error;
                if (attempt < this.retries) {
                    await this._sleep(this.retryDelay * attempt);
                }
            }
        }

        clearTimeout(timeout);
        return { success: false, error: lastError.message };
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { HttpClient };
