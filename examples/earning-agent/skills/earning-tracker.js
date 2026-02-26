/**
 * Earning Tracker Skill — 收益追踪技能
 * 
 * 追踪:
 * - 各平台收益
 * - API 调用成本
 * - 净利润计算
 */

class EarningTracker {
    constructor(config = {}) {
        this.currency = config.currency || 'CNY';
        this.exchangeRate = config.exchangeRate || 7.2;  // USD to CNY
    }

    /**
     * 执行收益追踪
     * @param {object} ctx - Agent context
     * @returns {Promise<object>} 收益报告
     */
    async execute(ctx) {
        console.log('  💰 开始追踪收益...');

        const finances = ctx.soul.data.finances || {};
        const today = new Date().toISOString().split('T')[0];

        // 计算各项指标
        const report = {
            date: today,
            total: {
                earnings: this.sumByType(finances.transactions, 'earning'),
                costs: this.sumByType(finances.transactions, 'cost'),
                netProfit: 0
            },
            today: {
                earnings: this.sumByTypeAndDate(finances.transactions, 'earning', today),
                costs: this.sumByTypeAndDate(finances.transactions, 'cost', today),
                netProfit: 0
            },
            byPlatform: this.groupByPlatform(finances.transactions),
            survivalStatus: 'UNKNOWN'
        };

        report.total.netProfit = report.total.earnings - report.total.costs;
        report.today.netProfit = report.today.earnings - report.today.costs;

        // 计算生存状态
        report.survivalStatus = this.calculateSurvivalStatus(report, finances);

        // 更新 soul
        ctx.soul.data.finances = {
            ...finances,
            totalEarnings: report.total.earnings,
            totalCosts: report.total.costs,
            netProfit: report.total.netProfit,
            lastReportDate: today
        };

        ctx.soul.data.state = ctx.soul.data.state || {};
        ctx.soul.data.state.survivalLevel = report.survivalStatus;

        // 生成报告
        console.log(`  📊 收益报告:`);
        console.log(`     总收入: ¥${report.total.earnings.toFixed(2)}`);
        console.log(`     总成本: ¥${report.total.costs.toFixed(2)}`);
        console.log(`     净利润: ¥${report.total.netProfit.toFixed(2)}`);
        console.log(`     今日净利: ¥${report.today.netProfit.toFixed(2)}`);
        console.log(`     生存状态: ${report.survivalStatus}`);

        ctx.soul.remember(
            `收益报告: 总收入¥${report.total.earnings.toFixed(0)}, ` +
            `总成本¥${report.total.costs.toFixed(0)}, ` +
            `净利润¥${report.total.netProfit.toFixed(0)}`
        );

        return report;
    }

    /**
     * 按类型汇总
     */
    sumByType(transactions, type) {
        return (transactions || [])
            .filter(t => t.type === type)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    /**
     * 按类型和日期汇总
     */
    sumByTypeAndDate(transactions, type, date) {
        return (transactions || [])
            .filter(t => t.type === type && t.date === date)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    /**
     * 按平台分组
     */
    groupByPlatform(transactions) {
        const byPlatform = {};
        
        for (const t of (transactions || [])) {
            const platform = t.platform || t.desc?.split(':')[0] || 'unknown';
            if (!byPlatform[platform]) {
                byPlatform[platform] = { earnings: 0, costs: 0 };
            }
            if (t.type === 'earning') {
                byPlatform[platform].earnings += t.amount || 0;
            } else {
                byPlatform[platform].costs += t.amount || 0;
            }
        }

        return byPlatform;
    }

    /**
     * 计算生存状态
     */
    calculateSurvivalStatus(report, finances) {
        const netProfit = report.total.netProfit;
        const dailyLimit = finances.dailyLimit || 20;

        // 计算最近7天的趋势
        const recentDays = this.getRecentDailyProfits(finances.transactions, 7);
        const avgDailyProfit = recentDays.reduce((a, b) => a + b, 0) / Math.max(recentDays.length, 1);

        if (netProfit < -50 || avgDailyProfit < -5) {
            return 'CRITICAL';   // 危机：需要立即行动
        } else if (netProfit < 0 || avgDailyProfit < 0) {
            return 'STRUGGLING'; // 挣扎：需要调整策略
        } else if (netProfit < 100 || avgDailyProfit < 10) {
            return 'STABLE';     // 稳定：可持续运行
        } else {
            return 'THRIVING';   // 繁荣：可以扩张
        }
    }

    /**
     * 获取最近N天的每日利润
     */
    getRecentDailyProfits(transactions, days) {
        const dailyProfits = {};
        
        for (const t of (transactions || [])) {
            if (!dailyProfits[t.date]) dailyProfits[t.date] = 0;
            dailyProfits[t.date] += t.type === 'earning' ? t.amount : -t.amount;
        }

        return Object.entries(dailyProfits)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, days)
            .map(([_, profit]) => profit);
    }

    /**
     * 记录收益
     */
    recordEarning(ctx, amount, description, platform = null) {
        ctx.soul.data.finances = ctx.soul.data.finances || {};
        ctx.soul.data.finances.transactions = ctx.soul.data.finances.transactions || [];

        const transaction = {
            date: new Date().toISOString().split('T')[0],
            type: 'earning',
            amount: parseFloat(amount),
            desc: description,
            timestamp: new Date().toISOString()
        };

        if (platform) transaction.platform = platform;

        ctx.soul.data.finances.transactions.push(transaction);
        console.log(`  💵 记录收益: ¥${amount} - ${description}`);

        return transaction;
    }

    /**
     * 记录成本
     */
    recordCost(ctx, amount, description, platform = null) {
        ctx.soul.data.finances = ctx.soul.data.finances || {};
        ctx.soul.data.finances.transactions = ctx.soul.data.finances.transactions || [];

        const transaction = {
            date: new Date().toISOString().split('T')[0],
            type: 'cost',
            amount: parseFloat(amount),
            desc: description,
            timestamp: new Date().toISOString()
        };

        if (platform) transaction.platform = platform;

        ctx.soul.data.finances.transactions.push(transaction);
        console.log(`  💸 记录成本: ¥${amount} - ${description}`);

        return transaction;
    }
}

module.exports = {
    name: 'earning-tracker',
    description: '追踪收益和成本',
    priority: 4,

    execute: async (ctx) => {
        const tracker = new EarningTracker();
        return tracker.execute(ctx);
    },

    EarningTracker
};
