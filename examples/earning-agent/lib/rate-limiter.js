/**
 * Rate Limiter — 速率限制器
 * 
 * 防止 API 调用过快被封
 * 支持令牌桶算法
 */

class RateLimiter {
    constructor(config = {}) {
        this.maxRequests = config.maxRequests || 60;     // 最大请求数
        this.windowMs = config.windowMs || 60000;        // 时间窗口 (毫秒)
        this.minInterval = config.minInterval || 1000;   // 最小间隔

        this.requests = [];  // 请求时间戳记录
        this.lastRequest = 0;
    }

    /**
     * 检查是否可以发送请求
     * @returns {boolean}
     */
    canRequest() {
        const now = Date.now();

        // 清理过期记录
        this.requests = this.requests.filter(t => now - t < this.windowMs);

        // 检查窗口内请求数
        if (this.requests.length >= this.maxRequests) {
            return false;
        }

        // 检查最小间隔
        if (now - this.lastRequest < this.minInterval) {
            return false;
        }

        return true;
    }

    /**
     * 等待直到可以发送请求
     * @returns {Promise<void>}
     */
    async waitForSlot() {
        while (!this.canRequest()) {
            const now = Date.now();
            const waitTime = Math.max(
                this.minInterval - (now - this.lastRequest),
                this.requests.length >= this.maxRequests 
                    ? this.windowMs - (now - this.requests[0])
                    : 0
            );
            await this._sleep(Math.max(waitTime, 100));
        }
    }

    /**
     * 记录一次请求
     */
    recordRequest() {
        const now = Date.now();
        this.requests.push(now);
        this.lastRequest = now;
    }

    /**
     * 执行带速率限制的操作
     * @param {Function} fn - 要执行的异步函数
     * @returns {Promise<any>}
     */
    async execute(fn) {
        await this.waitForSlot();
        this.recordRequest();
        return fn();
    }

    /**
     * 获取当前状态
     */
    getStatus() {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);
        return {
            requestsInWindow: this.requests.length,
            maxRequests: this.maxRequests,
            available: this.maxRequests - this.requests.length,
            windowMs: this.windowMs
        };
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { RateLimiter };
