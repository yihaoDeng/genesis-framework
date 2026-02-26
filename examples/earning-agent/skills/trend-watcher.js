/**
 * Trend Watcher Skill — 热点监控技能
 * 
 * 从多个来源抓取热点话题:
 * - Hacker News
 * - Reddit
 * - 微博热搜 (通过 RSS)
 * - 掘金热门
 */

const { HttpClient } = require('../lib/http');

class TrendWatcher {
    constructor(config = {}) {
        this.http = new HttpClient();
        this.sources = config.sources || ['hackernews', 'reddit'];
        this.minScore = config.minScore || 100;  // 最小热度阈值
    }

    /**
     * 执行热点监控
     * @param {object} ctx - Agent context
     * @returns {Promise<Array<{topic: string, score: number, source: string, url: string}>>}
     */
    async execute(ctx) {
        console.log('  🔍 开始监控热点...');
        const allTrends = [];

        // 并行获取所有来源
        const results = await Promise.allSettled([
            this.fetchHackerNews(),
            this.fetchReddit(),
            // this.fetchWeibo(),  // 需要 RSS 解析
            // this.fetchJuejin(), // 需要 API
        ]);

        for (const result of results) {
            if (result.status === 'fulfilled') {
                allTrends.push(...result.value);
            } else {
                console.log(`  ⚠️ 获取失败: ${result.reason?.message || 'unknown'}`);
            }
        }

        // 过滤低热度，排序
        const filtered = allTrends
            .filter(t => t.score >= this.minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);  // 取前20个

        // 记录到记忆
        ctx.soul.remember(`发现 ${filtered.length} 个热点话题`);
        console.log(`  ✅ 发现 ${filtered.length} 个热点话题`);

        return filtered;
    }

    /**
     * 获取 Hacker News 热门
     */
    async fetchHackerNews() {
        const trends = [];

        try {
            // 获取热门故事 ID
            const { data: ids } = await this.http.get(
                'https://hacker-news.firebaseio.com/v0/topstories.json'
            );

            // 获取前10个故事的详情
            const topIds = ids.slice(0, 10);
            const stories = await Promise.all(
                topIds.map(id =>
                    this.http.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
                )
            );

            for (const { data: story } of stories) {
                if (story && story.title) {
                    trends.push({
                        topic: story.title,
                        score: story.score || 0,
                        source: 'hackernews',
                        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                        comments: story.descendants || 0
                    });
                }
            }
        } catch (err) {
            console.log(`  ⚠️ HackerNews 获取失败: ${err.message}`);
        }

        return trends;
    }

    /**
     * 获取 Reddit 热门
     */
    async fetchReddit() {
        const trends = [];

        try {
            const subreddits = ['programming', 'artificial', 'technology'];
            
            for (const sub of subreddits) {
                const { data } = await this.http.get(
                    `https://www.reddit.com/r/${sub}/hot.json?limit=10`,
                    { headers: { 'User-Agent': 'EarningAgent/1.0' } }
                );

                if (data?.data?.children) {
                    for (const post of data.data.children) {
                        const p = post.data;
                        trends.push({
                            topic: p.title,
                            score: p.score || 0,
                            source: `reddit/${sub}`,
                            url: `https://reddit.com${p.permalink}`,
                            comments: p.num_comments || 0
                        });
                    }
                }

                // 避免 Reddit rate limit
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.log(`  ⚠️ Reddit 获取失败: ${err.message}`);
        }

        return trends;
    }

    /**
     * 分析话题价值 (使用 LLM)
     * @param {Array} trends - 热点列表
     * @param {object} llm - LLM adapter
     * @param {object} soul - Soul 对象
     * @returns {Promise<Array>} 排序后的有价值话题
     */
    async analyzeTrends(trends, llm, soul) {
        if (trends.length === 0) return [];

        const expertise = soul.data.topics?.expertise || ['技术', 'AI'];
        const recentTopics = (soul.data.content?.published || [])
            .slice(-10)
            .map(a => a.title);

        const prompt = `你是一个内容策略专家。分析以下热点话题，为我选择最值得写文章的话题。

我的专长领域: ${expertise.join(', ')}
最近写过的文章: ${recentTopics.slice(-5).join('; ') || '无'}

热点列表:
${trends.slice(0, 15).map((t, i) => `${i + 1}. ${t.topic} (热度: ${t.score}, 来源: ${t.source})`).join('\n')}

请返回 JSON 数组，选择 5 个最有价值的话题，按优先级排序:
[{"rank": 1, "index": 3, "reason": "为什么值得写", "angle": "建议的文章角度"}, ...]

只返回 JSON，不要其他内容。`;

        try {
            const response = await llm.chat(prompt, {
                system: '你是专业的内容策略师。只返回有效的 JSON，不要添加任何解释。'
            });

            const analysis = JSON.parse(response.content);
            
            return analysis.map(a => ({
                ...trends[a.index - 1],
                priority: a.rank,
                reason: a.reason,
                suggestedAngle: a.angle
            }));
        } catch (err) {
            console.log(`  ⚠️ LLM 分析失败: ${err.message}`);
            // 降级：返回原始排序
            return trends.slice(0, 5).map((t, i) => ({
                ...t,
                priority: i + 1,
                reason: '高热度话题',
                suggestedAngle: '深入分析'
            }));
        }
    }
}

module.exports = {
    name: 'trend-watcher',
    description: '监控网络热点，发现有价值的话题',
    priority: 1,
    execute: async (ctx) => {
        const watcher = new TrendWatcher();
        return watcher.execute(ctx);
    },
    TrendWatcher  // 导出类以便复用
};
