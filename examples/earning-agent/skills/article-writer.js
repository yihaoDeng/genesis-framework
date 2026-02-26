/**
 * Article Writer Skill — 文章生成技能
 * 
 * 使用 LLM 生成高质量技术文章
 * 包含: 研究、大纲、写作、优化
 */

class ArticleWriter {
    constructor(config = {}) {
        this.llm = config.llm;  // LLM Adapter 实例
        this.minWordCount = config.minWordCount || 800;  // 最小字数
        this.style = config.style || 'tutorial';  // tutorial, analysis, opinion
    }

    /**
     * 执行文章生成
     * @param {object} ctx - Agent context
     * @param {object} topic - 话题信息
     * @returns {Promise<{title: string, content: string, tags: string[], meta: object}>}
     */
    async execute(ctx, topic) {
        console.log(`  ✍️ 开始写作: ${topic.topic}`);

        // 1. 研究话题
        const research = await this.research(topic);
        
        // 2. 生成大纲
        const outline = await this.createOutline(topic, research);
        
        // 3. 撰写文章
        const draft = await this.writeContent(topic, outline, research);
        
        // 4. 优化标题和摘要
        const optimized = await this.optimize(draft);

        // 记录成本
        const stats = this.llm.getStats();
        ctx.soul.data.finances = ctx.soul.data.finances || {};
        ctx.soul.data.finances.transactions = ctx.soul.data.finances.transactions || [];
        ctx.soul.data.finances.transactions.push({
            date: new Date().toISOString().split('T')[0],
            type: 'cost',
            amount: stats.totalCost,
            desc: `LLM写作: ${topic.topic.slice(0, 30)}`
        });

        ctx.soul.remember(`完成文章: ${optimized.title}`);
        console.log(`  ✅ 文章完成: ${optimized.title} (${optimized.content.length} 字)`);

        return optimized;
    }

    /**
     * 研究话题
     */
    async research(topic) {
        const prompt = `请帮我研究这个话题，为写文章做准备:

话题: ${topic.topic}
${topic.suggestedAngle ? `建议角度: ${topic.suggestedAngle}` : ''}

请提供:
1. 核心概念和关键术语
2. 当前行业趋势和最新发展
3. 读者可能感兴趣的点
4. 类似文章可能的盲点

以 JSON 格式返回:
{"concepts": [...], "trends": [...], "interestPoints": [...], "blindSpots": [...]}`;

        try {
            const response = await this.llm.chat(prompt, {
                system: '你是专业的内容研究员。返回有效的 JSON。',
                temperature: 0.3
            });

            return JSON.parse(response.content);
        } catch (err) {
            console.log(`  ⚠️ 研究失败，使用基础信息: ${err.message}`);
            return {
                concepts: [topic.topic],
                trends: [],
                interestPoints: ['最新发展', '实践指南'],
                blindSpots: []
            };
        }
    }

    /**
     * 创建大纲
     */
    async createOutline(topic, research) {
        const prompt = `基于以下研究，为一篇技术文章创建详细大纲:

话题: ${topic.topic}
核心概念: ${research.concepts?.join(', ') || topic.topic}
读者兴趣点: ${research.interestPoints?.join(', ') || '全面介绍'}

要求:
1. 结构清晰，逻辑递进
2. 包含代码示例位置标记
3. 预估每个部分的字数
4. 适合开发者阅读

返回 JSON 格式:
{
  "title": "建议标题",
  "subtitle": "副标题",
  "sections": [
    {"heading": "引言", "points": ["钩子", "背景", "文章结构"], "wordCount": 200},
    ...
  ]
}`;

        try {
            const response = await this.llm.chat(prompt, {
                system: '你是专业的技术编辑。返回有效的 JSON。',
                temperature: 0.5
            });

            return JSON.parse(response.content);
        } catch (err) {
            console.log(`  ⚠️ 大纲生成失败: ${err.message}`);
            // 返回默认大纲
            return {
                title: topic.topic,
                subtitle: '',
                sections: [
                    { heading: '引言', points: ['背景介绍'], wordCount: 200 },
                    { heading: '核心概念', points: ['详细解释'], wordCount: 300 },
                    { heading: '实践指南', points: ['代码示例'], wordCount: 400 },
                    { heading: '总结', points: ['要点回顾'], wordCount: 200 }
                ]
            };
        }
    }

    /**
     * 撰写内容
     */
    async writeContent(topic, outline, research) {
        const prompt = `根据以下大纲撰写一篇高质量技术文章:

标题: ${outline.title}
${outline.subtitle ? `副标题: ${outline.subtitle}` : ''}

大纲:
${outline.sections.map((s, i) => `${i + 1}. ${s.heading}: ${s.points?.join(', ') || ''}`).join('\n')}

写作要求:
1. 语言简洁专业，适合开发者
2. 使用 Markdown 格式
3. 包含代码示例（使用 \`\`\` 代码块）
4. 字数 ${this.minWordCount}+
5. 原创内容，不要复制

直接返回 Markdown 格式的文章内容。`;

        const response = await this.llm.chat(prompt, {
            system: '你是专业的技术作家。直接返回 Markdown 内容，不要包裹在代码块中。',
            temperature: 0.7,
            maxTokens: 4000
        });

        return {
            title: outline.title,
            content: response.content,
            wordCount: response.content.split(/\s+/).length,
            cost: response.cost
        };
    }

    /**
     * 优化标题和生成元数据
     */
    async optimize(draft) {
        const prompt = `为这篇文章优化标题并生成元数据:

原标题: ${draft.title}
内容预览: ${draft.content.slice(0, 500)}...

请提供:
1. 3个优化后的标题选项（吸引点击但不过度标题党）
2. 5个适合的标签
3. 一段100字以内的摘要
4. SEO 关键词

返回 JSON:
{
  "titleOptions": ["标题1", "标题2", "标题3"],
  "tags": ["tag1", "tag2", ...],
  "excerpt": "...",
  "keywords": ["kw1", "kw2", ...]
}`;

        try {
            const response = await this.llm.chat(prompt, {
                system: '你是专业的内容优化师。返回有效的 JSON。',
                temperature: 0.5
            });

            const meta = JSON.parse(response.content);

            return {
                title: meta.titleOptions[0],  // 使用第一个标题
                content: draft.content,
                tags: meta.tags,
                excerpt: meta.excerpt,
                keywords: meta.keywords,
                alternativeTitles: meta.titleOptions.slice(1),
                wordCount: draft.wordCount
            };
        } catch (err) {
            console.log(`  ⚠️ 优化失败: ${err.message}`);
            return {
                title: draft.title,
                content: draft.content,
                tags: ['technology', 'programming'],
                excerpt: draft.content.slice(0, 150) + '...',
                keywords: [],
                wordCount: draft.wordCount
            };
        }
    }
}

// 导出为 Skill 格式
module.exports = {
    name: 'article-writer',
    description: '使用 AI 生成高质量技术文章',
    priority: 2,
    
    // 需要 llm 实例在 context 中
    execute: async (ctx) => {
        const topic = ctx.currentTopic;
        if (!topic) {
            throw new Error('No topic set. Set ctx.currentTopic before calling article-writer.');
        }

        const writer = new ArticleWriter({
            llm: ctx.llm,
            minWordCount: 800
        });

        return writer.execute(ctx, topic);
    },

    ArticleWriter  // 导出类
};
