/**
 * LLM Adapter — 统一的 LLM 调用接口
 * 
 * 支持: Claude (推荐), OpenAI, 本地模型
 * 零依赖实现，使用 Node.js 18+ 内置 fetch
 */

class LLMAdapter {
    constructor(config = {}) {
        this.provider = config.provider || 'claude';
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
        this.model = config.model || 'claude-3-5-sonnet-20241022';
        this.maxTokens = config.maxTokens || 4096;
        this.temperature = config.temperature || 0.7;

        // 成本追踪
        this.usageStats = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCost: 0,
            requests: 0
        };

        // 定价 (USD per 1M tokens)
        this.pricing = {
            'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
            'claude-3-opus-20240229': { input: 15, output: 75 },
            'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        };
    }

    /**
     * 发送消息到 LLM
     * @param {string|Array} messages - 消息内容或消息数组
     * @param {object} options - 可选配置
     * @returns {Promise<{content: string, usage: object, cost: number}>}
     */
    async chat(messages, options = {}) {
        const formattedMessages = this._formatMessages(messages);
        const model = options.model || this.model;

        let result;
        switch (this.provider) {
            case 'claude':
                result = await this._callClaude(formattedMessages, options);
                break;
            case 'openai':
                result = await this._callOpenAI(formattedMessages, options);
                break;
            default:
                throw new Error(`Unknown provider: ${this.provider}`);
        }

        // 更新统计
        this.usageStats.totalInputTokens += result.usage.input_tokens;
        this.usageStats.totalOutputTokens += result.usage.output_tokens;
        this.usageStats.requests++;

        // 计算成本
        const cost = this._calculateCost(result.usage, model);
        this.usageStats.totalCost += cost;
        result.cost = cost;

        return result;
    }

    /**
     * 调用 Claude API
     */
    async _callClaude(messages, options) {
        const systemPrompt = options.system || '你是一个专业的技术写作助手。';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: options.model || this.model,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature ?? this.temperature,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        return {
            content: data.content[0].text,
            usage: {
                input_tokens: data.usage.input_tokens,
                output_tokens: data.usage.output_tokens
            },
            raw: data
        };
    }

    /**
     * 调用 OpenAI API (预留)
     */
    async _callOpenAI(messages, options) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: options.model || 'gpt-4-turbo-preview',
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature ?? this.temperature,
                messages: messages
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        return {
            content: data.choices[0].message.content,
            usage: {
                input_tokens: data.usage.prompt_tokens,
                output_tokens: data.usage.completion_tokens
            },
            raw: data
        };
    }

    /**
     * 格式化消息
     */
    _formatMessages(messages) {
        if (typeof messages === 'string') {
            return [{ role: 'user', content: messages }];
        }
        return messages;
    }

    /**
     * 计算成本
     */
    _calculateCost(usage, model) {
        const pricing = this.pricing[model] || { input: 3, output: 15 };
        const inputCost = (usage.input_tokens / 1000000) * pricing.input;
        const outputCost = (usage.output_tokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    }

    /**
     * 获取使用统计
     */
    getStats() {
        return { ...this.usageStats };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.usageStats = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCost: 0,
            requests: 0
        };
    }
}

module.exports = { LLMAdapter };
