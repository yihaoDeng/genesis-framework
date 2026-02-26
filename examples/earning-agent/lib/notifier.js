/**
 * Notifier — 消息推送模块
 * 
 * 支持:
 * - Server酱（推荐，推送到微信）
 * - PushPlus（备选）
 * - 企业微信机器人
 * 
 * 使用场景:
 * - Agent 需要帮助时通知你
 * - 发布成功/失败通知
 * - 预算超支警告
 * - 每日报告
 */

const { HttpClient } = require('./http');

class Notifier {
    constructor(config = {}) {
        this.http = new HttpClient();
        
        // Server酱配置
        this.serverchanKey = config.serverchanKey || process.env.SERVERCHAN_KEY;
        
        // PushPlus配置（备选）
        this.pushplusToken = config.pushplusToken || process.env.PUSHPLUS_TOKEN;
        
        // 企业微信机器人
        this.wecomWebhook = config.wecomWebhook || process.env.WECOM_WEBHOOK;
        
        // 通知级别
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARNING: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        
        // 最小通知级别（低于此级别不发送）
        this.minLevel = config.minLevel || 'INFO';
    }

    /**
     * 发送消息（自动选择可用通道）
     * @param {string} title - 标题
     * @param {string} content - 内容（支持Markdown）
     * @param {object} options - 选项
     */
    async send(title, content, options = {}) {
        const level = options.level || 'INFO';
        
        // 检查级别
        if (this.levels[level] < this.levels[this.minLevel]) {
            return { success: true, skipped: true, reason: '级别过低' };
        }

        // 尝试各种通道
        const results = [];

        // 1. Server酱
        if (this.serverchanKey) {
            const result = await this.sendViaServerchan(title, content);
            results.push({ channel: 'serverchan', ...result });
            if (result.success) return { success: true, channel: 'serverchan' };
        }

        // 2. PushPlus
        if (this.pushplusToken) {
            const result = await this.sendViaPushplus(title, content);
            results.push({ channel: 'pushplus', ...result });
            if (result.success) return { success: true, channel: 'pushplus' };
        }

        // 3. 企业微信
        if (this.wecomWebhook) {
            const result = await this.sendViaWecom(title, content);
            results.push({ channel: 'wecom', ...result });
            if (result.success) return { success: true, channel: 'wecom' };
        }

        // 全部失败
        return {
            success: false,
            results,
            error: '没有可用的通知通道，请配置 SERVERCHAN_KEY 或 PUSHPLUS_TOKEN'
        };
    }

    /**
     * Server酱发送
     * 文档: https://sct.ftqq.com/
     */
    async sendViaServerchan(title, content) {
        try {
            const url = `https://sctapi.ftqq.com/${this.serverchanKey}.send`;
            
            const { data, success, error } = await this.http.post(url, {
                title: title,
                desp: content  // 支持Markdown
            });

            if (success && data.code === 0) {
                return { success: true, messageId: data.data?.pushid };
            }

            return { success: false, error: data?.message || error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * PushPlus发送
     * 文档: http://www.pushplus.plus/
     */
    async sendViaPushplus(title, content) {
        try {
            const url = 'https://www.pushplus.plus/send';
            
            const { data, success, error } = await this.http.post(url, {
                token: this.pushplusToken,
                title: title,
                content: content,
                template: 'markdown'
            });

            if (success && data.code === 200) {
                return { success: true };
            }

            return { success: false, error: data?.msg || error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * 企业微信机器人发送
     */
    async sendViaWecom(title, content) {
        try {
            const { data, success, error } = await this.http.post(this.wecomWebhook, {
                msgtype: 'markdown',
                markdown: {
                    content: `## ${title}\n\n${content}`
                }
            });

            if (success && data.errcode === 0) {
                return { success: true };
            }

            return { success: false, error: data?.errmsg || error };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    // ========== 便捷方法 ==========

    /**
     * 发送信息
     */
    async info(title, content) {
        return this.send(title, content, { level: 'INFO' });
    }

    /**
     * 发送警告
     */
    async warning(title, content) {
        return this.send(title, content, { level: 'WARNING' });
    }

    /**
     * 发送错误
     */
    async error(title, content) {
        return this.send(title, content, { level: 'ERROR' });
    }

    /**
     * 发送紧急消息
     */
    async critical(title, content) {
        return this.send(title, content, { level: 'CRITICAL' });
    }

    /**
     * Agent 请求帮助
     */
    async askForHelp(agentName, context) {
        const title = `🆘 ${agentName} 需要帮助`;
        const content = `
**Agent**: ${agentName}
**周期**: ${context.cycle}
**时间**: ${new Date().toLocaleString('zh-CN')}

**问题**:
${context.issue || '遇到无法处理的情况'}

**上下文**:
\`\`\`
${JSON.stringify(context, null, 2)}
\`\`\`

---
*请登录查看详情或回复指令*
`;
        return this.send(title, content, { level: 'CRITICAL' });
    }

    /**
     * 发布成功通知
     */
    async publishSuccess(article) {
        const title = `✅ 文章发布成功`;
        const content = `
**标题**: ${article.title}
**平台**: ${article.platforms?.join(', ') || '微信公众号'}
**时间**: ${new Date().toLocaleString('zh-CN')}

[点击查看](${article.url || '#'})
`;
        return this.send(title, content, { level: 'INFO' });
    }

    /**
     * 发布失败通知
     */
    async publishFailed(article, error) {
        const title = `❌ 文章发布失败`;
        const content = `
**标题**: ${article.title}
**错误**: ${error}
**时间**: ${new Date().toLocaleString('zh-CN')}

需要人工介入处理。
`;
        return this.send(title, content, { level: 'ERROR' });
    }

    /**
     * 预算警告
     */
    async budgetWarning(usage, limit) {
        const title = `⚠️ 预算警告`;
        const content = `
**今日支出**: ¥${usage.toFixed(2)}
**预算上限**: ¥${limit.toFixed(2)}
**使用率**: ${(usage / limit * 100).toFixed(1)}%

Agent 将进入保守模式。
`;
        return this.send(title, content, { level: 'WARNING' });
    }

    /**
     * 每日报告
     */
    async dailyReport(report) {
        const title = `📊 每日报告 - ${new Date().toLocaleDateString('zh-CN')}`;
        const content = `
## 今日统计

- **发布文章**: ${report.articlesPublished || 0} 篇
- **总收入**: ¥${(report.earnings || 0).toFixed(2)}
- **总支出**: ¥${(report.costs || 0).toFixed(2)}
- **净利润**: ¥${(report.netProfit || 0).toFixed(2)}

## 生存状态

${report.survivalLevel || 'STABLE'}

## 下一步计划

${report.nextSteps || '继续正常运营'}
`;
        return this.send(title, content, { level: 'INFO' });
    }
}

/**
 * 快速发送（不需要实例化）
 */
async function quickNotify(title, content) {
    const notifier = new Notifier();
    return notifier.send(title, content);
}

module.exports = {
    Notifier,
    quickNotify
};
