/**
 * Strategy Optimizer Skill — 策略优化技能
 * 
 * 分析历史数据，调整内容策略
 * 在 evolve 阶段执行
 */

class StrategyOptimizer {
    constructor(config = {}) {
        this.llm = config.llm;
        this.lookbackDays = config.lookbackDays || 7;
    }

    /**
     * 执行策略优化
     * @param {object} ctx - Agent context
     * @returns {Promise<object>} 优化建议
     */
    async execute(ctx) {
        console.log('  🧠 分析策略，优化模型...');

        const analysis = {
            performance: this.analyzePerformance(ctx),
            recommendations: [],
            adjustments: {}
        };

        // 分析内容表现
        const contentAnalysis = this.analyzeContentPerformance(ctx);
        analysis.contentAnalysis = contentAnalysis;

        // 使用 LLM 生成建议
        if (this.llm) {
            try {
                analysis.recommendations = await this.generateRecommendations(ctx, contentAnalysis);
            } catch (err) {
                console.log(`  ⚠️ LLM 建议生成失败: ${err.message}`);
            }
        }

        // 应用策略调整
        analysis.adjustments = this.applyAdjustments(ctx, analysis);

        // 记录优化
        ctx.soul.logEvolution(
            'Strategy optimization',
            JSON.stringify(analysis.adjustments)
        );

        console.log(`  ✅ 策略优化完成`);
        return analysis;
    }

    /**
     * 分析整体表现
     */
    analyzePerformance(ctx) {
        const finances = ctx.soul.data.finances || {};
        const transactions = finances.transactions || [];

        const recentTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - this.lookbackDays);
            return txDate >= cutoff;
        });

        const totalEarnings = recentTransactions
            .filter(t => t.type === 'earning')
            .reduce((s, t) => s + t.amount, 0);

        const totalCosts = recentTransactions
            .filter(t => t.type === 'cost')
            .reduce((s, t) => s + t.amount, 0);

        const roi = totalCosts > 0 ? ((totalEarnings - totalCosts) / totalCosts * 100) : 0;

        return {
            period: `${this.lookbackDays} days`,
            totalEarnings,
            totalCosts,
            netProfit: totalEarnings - totalCosts,
            roi: roi.toFixed(1) + '%',
            transactionCount: recentTransactions.length
        };
    }

    /**
     * 分析内容表现
     */
    analyzeContentPerformance(ctx) {
        const published = (ctx.soul.data.content?.published || [])
            .slice(-20);  // 最近20篇

        if (published.length === 0) {
            return { avgViews: 0, avgEngagement: 0, topTopics: [] };
        }

        // 按话题分析表现
        const topicPerformance = {};
        for (const article of published) {
            // 提取话题关键词
            const keywords = this.extractKeywords(article.title);
            for (const kw of keywords) {
                if (!topicPerformance[kw]) {
                    topicPerformance[kw] = { count: 0, totalViews: 0 };
                }
                topicPerformance[kw].count++;
                topicPerformance[kw].totalViews += article.views || 0;
            }
        }

        // 找出最佳话题
        const topTopics = Object.entries(topicPerformance)
            .map(([topic, data]) => ({
                topic,
                count: data.count,
                avgViews: Math.round(data.totalViews / data.count)
            }))
            .filter(t => t.count >= 2)  // 至少写过2次
            .sort((a, b) => b.avgViews - a.avgViews)
            .slice(0, 5);

        return {
            totalArticles: published.length,
            avgViews: published.reduce((s, a) => s + (a.views || 0), 0) / published.length,
            topTopics
        };
    }

    /**
     * 提取关键词
     */
    extractKeywords(title) {
        const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are'];
        return (title || '')
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.includes(w))
            .slice(0, 3);
    }

    /**
     * 使用 LLM 生成建议
     */
    async generateRecommendations(ctx, contentAnalysis) {
        const prompt = `基于以下数据分析，为内容创作提供策略建议:

近期表现:
- 发布文章: ${contentAnalysis.totalArticles} 篇
- 平均阅读: ${Math.round(contentAnalysis.avgViews)}

最佳话题:
${contentAnalysis.topTopics.map(t => `- ${t.topic}: ${t.avgViews} 平均阅读`).join('\n')}

我的专长: ${(ctx.soul.data.topics?.expertise || []).join(', ')}

请提供 3-5 条具体可行的建议，JSON 格式:
[{"priority": 1, "action": "...", "reason": "...", "expectedImpact": "..."}, ...]`;

        const response = await this.llm.chat(prompt, {
            system: '你是专业的内容策略顾问。返回有效的 JSON 数组。',
            temperature: 0.5
        });

        try {
            return JSON.parse(response.content);
        } catch {
            return [];
        }
    }

    /**
     * 应用策略调整
     */
    applyAdjustments(ctx, analysis) {
        const adjustments = {};

        // 根据生存状态调整模式
        const status = ctx.soul.data.state?.survivalLevel || 'UNKNOWN';

        switch (status) {
            case 'CRITICAL':
                adjustments.mode = 'CONSERVATION';
                adjustments.dailyLimit = 10;  // 降低预算
                adjustments.publishFrequency = 1;  // 减少发布
                break;

            case 'STRUGGLING':
                adjustments.mode = 'CAREFUL';
                adjustments.dailyLimit = 15;
                adjustments.publishFrequency = 2;
                break;

            case 'STABLE':
                adjustments.mode = 'NORMAL';
                adjustments.dailyLimit = 20;
                adjustments.publishFrequency = 3;
                break;

            case 'THRIVING':
                adjustments.mode = 'GROWTH';
                adjustments.dailyLimit = 30;
                adjustments.publishFrequency = 4;
                // 可以考虑复制自己
                break;
        }

        // 应用调整
        if (adjustments.dailyLimit) {
            ctx.soul.data.finances = ctx.soul.data.finances || {};
            ctx.soul.data.finances.dailyLimit = adjustments.dailyLimit;
        }

        ctx.soul.data.state = ctx.soul.data.state || {};
        ctx.soul.data.state.mode = adjustments.mode || 'NORMAL';

        return adjustments;
    }
}

module.exports = {
    name: 'strategy-optimizer',
    description: '分析历史数据，优化内容策略',
    priority: 5,

    execute: async (ctx) => {
        const optimizer = new StrategyOptimizer({
            llm: ctx.llm,
            lookbackDays: 7
        });
        return optimizer.execute(ctx);
    },

    StrategyOptimizer
};
