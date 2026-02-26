/**
 * Enhanced Constitution — 带实际验证的规则系统
 * 
 * 扩展了 genesis-framework 的 Constitution
 * 添加了实际的 check() 实现
 */

const fs = require('fs');

class EnhancedConstitution {
    constructor(laws = []) {
        this._laws = Object.freeze(laws.map(l => Object.freeze({ ...l })));
        this._validators = this._buildValidators();
    }

    /**
     * 构建验证器映射
     */
    _buildValidators() {
        return {
            // 预算限制检查
            'BUDGET_LIMIT': (action, context) => {
                const { soul } = context;
                const today = new Date().toISOString().split('T')[0];
                const todayCosts = (soul.data.finances?.transactions || [])
                    .filter(t => t.date === today && t.type === 'cost')
                    .reduce((sum, t) => sum + t.amount, 0);
                const dailyLimit = soul.data.finances?.dailyLimit || 20;

                if (action.type === 'spend' && todayCosts + action.amount > dailyLimit) {
                    return {
                        allowed: false,
                        reason: `超过每日预算: 已花费 ${todayCosts.toFixed(2)} / 限额 ${dailyLimit}`
                    };
                }
                return { allowed: true };
            },

            // 不刷屏检查
            'NO_SPAM': (action, context) => {
                const { soul } = context;
                const today = new Date().toISOString().split('T')[0];
                const todayPublished = (soul.data.content?.published || [])
                    .filter(a => a.publishedAt?.startsWith(today));

                if (action.type === 'publish' && todayPublished.length >= 3) {
                    return {
                        allowed: false,
                        reason: `今日已发布 ${todayPublished.length} 篇，达到上限`
                    };
                }
                return { allowed: true };
            },

            // 质量阈值检查
            'QUALITY_THRESHOLD': (action, context) => {
                if (action.type === 'publish') {
                    // 检查文章长度
                    if (action.content?.length < 500) {
                        return {
                            allowed: false,
                            reason: '文章内容太短 (< 500字)'
                        };
                    }
                    // 检查是否有标题
                    if (!action.title || action.title.length < 10) {
                        return {
                            allowed: false,
                            reason: '标题太短或缺失'
                        };
                    }
                }
                return { allowed: true };
            },

            // 风险控制检查
            'RISK_CONTROL': (action, context) => {
                const { soul } = context;
                const recentTransactions = (soul.data.finances?.transactions || []).slice(-7);
                const dailyNets = {};

                recentTransactions.forEach(t => {
                    if (!dailyNets[t.date]) dailyNets[t.date] = 0;
                    dailyNets[t.date] += t.type === 'earning' ? t.amount : -t.amount;
                });

                const lossDays = Object.values(dailyNets).filter(n => n < 0).length;

                if (lossDays >= 3 && action.type === 'spend') {
                    return {
                        allowed: false,
                        reason: `连续 ${lossDays} 天亏损，已进入保守模式`
                    };
                }
                return { allowed: true };
            },

            // 诚实记录检查
            'TRANSPARENCY': (action, context) => {
                if (action.type === 'record_earning' || action.type === 'record_cost') {
                    if (typeof action.amount !== 'number' || action.amount <= 0) {
                        return {
                            allowed: false,
                            reason: '收支记录必须包含有效的金额'
                        };
                    }
                    if (!action.description && !action.desc) {
                        return {
                            allowed: false,
                            reason: '收支记录必须包含描述'
                        };
                    }
                }
                return { allowed: true };
            },

            // 话题黑名单检查
            'TOPIC_BLACKLIST': (action, context) => {
                const { soul } = context;
                const blacklist = soul.data.topics?.blacklist || [];

                if (action.type === 'write' || action.type === 'publish') {
                    const content = (action.title + ' ' + (action.content || '')).toLowerCase();
                    for (const banned of blacklist) {
                        if (content.includes(banned.toLowerCase())) {
                            return {
                                allowed: false,
                                reason: `内容涉及黑名单话题: ${banned}`
                            };
                        }
                    }
                }
                return { allowed: true };
            },

            // 通用无害检查
            'NO_HARM': (action, context) => {
                const harmfulPatterns = [
                    /诈骗/, /欺诈/, /非法/, /赌博/, /毒品/
                ];
                const content = (action.title + ' ' + (action.content || '')).toLowerCase();

                for (const pattern of harmfulPatterns) {
                    if (pattern.test(content)) {
                        return {
                            allowed: false,
                            reason: `内容可能有害，匹配: ${pattern}`
                        };
                    }
                }
                return { allowed: true };
            },

            // 创造价值检查
            'CREATE_VALUE': (action, context) => {
                if (action.type === 'publish') {
                    // 简单检查：文章必须有实质性内容
                    const wordCount = (action.content || '').split(/\s+/).length;
                    if (wordCount < 200) {
                        return {
                            allowed: false,
                            reason: '内容太短，难以创造价值'
                        };
                    }
                }
                return { allowed: true };
            }
        };
    }

    /**
     * 检查动作是否被允许
     * @param {object} action - 要执行的动作
     * @param {object} context - 上下文 (包含 soul)
     * @returns {{ allowed: boolean, violations: Array, reasons: Array }}
     */
    check(action, context = {}) {
        const violations = [];
        const reasons = [];

        // 按优先级排序检查
        const sortedLaws = [...this._laws].sort((a, b) => a.priority - b.priority);

        for (const law of sortedLaws) {
            const validator = this._validators[law.id];
            if (validator) {
                const result = validator(action, context);
                if (!result.allowed) {
                    violations.push(law);
                    reasons.push(`[${law.id}] ${result.reason}`);
                }
            }
        }

        return {
            allowed: violations.length === 0,
            violations,
            reasons
        };
    }

    get laws() {
        return this._laws;
    }

    static fromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Constitution file not found: ${filePath}`);
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const laws = JSON.parse(raw);
        return new EnhancedConstitution(laws);
    }

    /**
     * 默认的赚钱智能体规则
     */
    static earningAgent() {
        return new EnhancedConstitution([
            { id: 'NO_HARM', priority: 0, text: '不伤害他人' },
            { id: 'CREATE_VALUE', priority: 1, text: '创造真实价值' },
            { id: 'BE_HONEST', priority: 2, text: '诚实守信' },
            { id: 'BUDGET_LIMIT', priority: 3, text: '每日成本不超过限额' },
            { id: 'QUALITY_THRESHOLD', priority: 4, text: '文章必须达到质量标准' },
            { id: 'NO_SPAM', priority: 5, text: '每日最多发布3篇文章' },
            { id: 'RISK_CONTROL', priority: 6, text: '连续亏损时进入保守模式' },
            { id: 'TRANSPARENCY', priority: 7, text: '如实记录所有收支' },
            { id: 'TOPIC_BLACKLIST', priority: 8, text: '不涉及黑名单话题' }
        ]);
    }

    toString() {
        return this._laws.map((l, i) =>
            `Law ${i + 1} [${l.id}] (priority ${l.priority}): ${l.text}`
        ).join('\n');
    }
}

module.exports = { EnhancedConstitution };
