/**
 * Earning Agent — 自主赚钱智能体
 * 
 * 基于 genesis-framework 构建
 * 能力: 抓热点 → 写文章 → 发布 → 赚钱
 * 
 * 使用方法:
 *   node index.js                # 运行单次循环
 *   node index.js --loop         # 持续运行
 *   node index.js --loop 3600000 # 每小时运行一次
 * 
* 环境变量:
 *   ANTHROPIC_API_KEY  - Claude API 密钥 (必须)
 *   SERVERCHAN_KEY     - Server酱推送Key (可选，用于通知)
 *   DEVTO_API_KEY      - Dev.to API 密钥 (可选)
 *   
 * 微信自动发布：
 *   首次运行会打开浏览器窗口，扫码登录后自动保存状态
 *   后续运行无需再次扫码
 *   
 * 通知功能：
 *   配置 SERVERCHAN_KEY 后，Agent 会在需要帮助时给你发微信
 */

const { Agent, Soul } = require('../../index');
const { LLMAdapter } = require('./lib/llm');
const { EnhancedConstitution } = require('./lib/constitution');
const { Notifier } = require('./lib/notifier');

// Skills
const { TrendWatcher } = require('./skills/trend-watcher');
const { ArticleWriter } = require('./skills/article-writer');
const { Publisher } = require('./skills/publisher');
const { EarningTracker } = require('./skills/earning-tracker');
const { StrategyOptimizer } = require('./skills/strategy-optimizer');
const { WeChatPublisher } = require('./skills/wechat-publisher');
const { WeChatAutoPublisher, checkLoginStatus } = require('./skills/wechat-auto-publisher');

// ═══════════════════════════════════════════
//  配置
// ═══════════════════════════════════════════

const CONFIG = {
    name: 'EarningAgent',
    soulPath: './data/soul.json',
    constitutionPath: null,  // 使用默认商业规则
    
    // LLM 配置
    llm: {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096
    },
    
    // 平台配置
    platforms: ['devto', 'wechat'],  // 支持多平台
    
    // 微信公众号配置
    wechat: {
        enabled: true,
        autoPublish: true,       // 启用自动发布（浏览器自动化）
        headless: false,         // 首次登录需要显示窗口扫码
        saveOnly: true,          // true=只保存草稿，false=直接发布
        outputDir: './data/wechat-drafts',
        userDataDir: './data/wechat-browser'  // 浏览器登录状态保存
    },
    
    // 预算
    dailyBudgetLimit: 20,  // CNY
    
    // 发布频率
    maxDailyPublish: 3
};

// ═══════════════════════════════════════════
//  初始化
// ═══════════════════════════════════════════

// 检查 API Key
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ 请设置环境变量 ANTHROPIC_API_KEY');
    process.exit(1);
}

// 创建 LLM 适配器
const llm = new LLMAdapter(CONFIG.llm);

// 创建通知器（用于给主人发消息）
const notifier = new Notifier({
    serverchanKey: process.env.SERVERCHAN_KEY,
    pushplusToken: process.env.PUSHPLUS_TOKEN
});

// 创建宪法
const constitution = EnhancedConstitution.earningAgent();

// 创建 Agent
const agent = new Agent({
    name: CONFIG.name,
    soulPath: CONFIG.soulPath
});

// 替换默认 constitution
agent.constitution = constitution;

// 初始化 Soul 扩展字段
function initSoulExtensions(soul) {
    soul.data.finances = soul.data.finances || {
        totalEarnings: 0,
        totalCosts: 0,
        dailyLimit: CONFIG.dailyBudgetLimit,
        transactions: []
    };
    
    soul.data.content = soul.data.content || {
        published: [],
        drafts: [],
        ideas: []
    };
    
    soul.data.topics = soul.data.topics || {
        watching: ['AI', 'programming', 'technology'],
        blacklist: ['政治', '争议话题'],
        expertise: ['技术教程', '行业分析', 'AI应用']
    };
    
    soul.save();
}

// ═══════════════════════════════════════════
//  生命周期处理器
// ═══════════════════════════════════════════

// 扩展 context
agent._createContext = function() {
    return {
        agent: this,
        soul: this.soul,
        constitution: this.constitution,
        skills: this.skills,
        cycle: this.soul.cycle,
        results: {},
        
        // 扩展字段
        llm: llm,
        notifier: notifier,  // 通知器
        config: CONFIG,
        currentTopic: null,
        currentArticle: null
    };
};

// WAKE: 唤醒，加载状态
agent.on('wake', async (ctx) => {
    console.log(`\n🌅 [WAKE] ${ctx.agent.name} 唤醒，周期 ${ctx.cycle}`);
    
    // 初始化扩展字段
    initSoulExtensions(ctx.soul);
    
    // 显示当前状态
    const finances = ctx.soul.data.finances;
    console.log(`  💰 当前财务状态:`);
    console.log(`     总收入: ¥${finances.totalEarnings.toFixed(2)}`);
    console.log(`     总成本: ¥${finances.totalCosts.toFixed(2)}`);
    console.log(`     净利润: ¥${(finances.totalEarnings - finances.totalCosts).toFixed(2)}`);
    console.log(`     今日预算: ¥${finances.dailyLimit}`);
    
    // 检查今日已发布数量
    const today = new Date().toISOString().split('T')[0];
    const todayPublished = (ctx.soul.data.content?.published || [])
        .filter(a => a.publishedAt?.startsWith(today));
    console.log(`  📝 今日已发布: ${todayPublished.length} / ${CONFIG.maxDailyPublish}`);
    
    // 如果已达上限，跳过本次
    if (todayPublished.length >= CONFIG.maxDailyPublish) {
        console.log(`  ⏸️ 今日发布已达上限，等待明天`);
        ctx.skipAct = true;
    }
});

// THINK: 思考，分析热点
agent.on('think', async (ctx) => {
    if (ctx.skipAct) return;
    
    console.log(`\n🤔 [THINK] 分析热点，规划行动`);
    
    const watcher = new TrendWatcher();
    
    // 获取热点
    const trends = await watcher.execute(ctx);
    
    if (trends.length === 0) {
        console.log(`  ⚠️ 未发现合适的热点`);
        ctx.skipAct = true;
        return;
    }
    
    // 使用 LLM 分析价值
    console.log(`  🧠 分析热点价值...`);
    const analyzedTrends = await watcher.analyzeTrends(trends, ctx.llm, ctx.soul);
    
    if (analyzedTrends.length === 0) {
        console.log(`  ⚠️ 没有找到有价值的话题`);
        ctx.skipAct = true;
        return;
    }
    
    // 选择最佳话题
    const selectedTopic = analyzedTrends[0];
    ctx.currentTopic = selectedTopic;
    
    console.log(`  ✅ 选择话题: ${selectedTopic.topic}`);
    console.log(`     推荐角度: ${selectedTopic.suggestedAngle || '深入分析'}`);
    console.log(`     理由: ${selectedTopic.reason || '高热度'}`);
    
    ctx.soul.remember(`选择话题: ${selectedTopic.topic}`);
});

// ACT: 行动，生成并发布内容
agent.on('act', async (ctx) => {
    if (ctx.skipAct || !ctx.currentTopic) {
        console.log(`\n⚡ [ACT] 跳过本次行动`);
        return;
    }
    
    console.log(`\n⚡ [ACT] 执行内容创作`);
    
    // 检查预算
    const budgetCheck = ctx.constitution.check(
        { type: 'spend', amount: 5 },  // 预估成本
        { soul: ctx.soul }
    );
    
    if (!budgetCheck.allowed) {
        console.log(`  ⚠️ 预算检查未通过: ${budgetCheck.reasons.join('; ')}`);
        ctx.skipAct = true;
        return;
    }
    
    // 生成文章
    const writer = new ArticleWriter({ llm: ctx.llm });
    const article = await writer.execute(ctx, ctx.currentTopic);
    
    // 检查内容质量
    const qualityCheck = ctx.constitution.check(
        { type: 'publish', title: article.title, content: article.content },
        { soul: ctx.soul }
    );
    
    if (!qualityCheck.allowed) {
        console.log(`  ⚠️ 质量检查未通过: ${qualityCheck.reasons.join('; ')}`);
        // 保存为草稿
        ctx.soul.data.content.drafts.push({
            title: article.title,
            content: article.content,
            reason: qualityCheck.reasons.join('; '),
            createdAt: new Date().toISOString()
        });
        return;
    }
    
    ctx.currentArticle = article;
    
    // 发布到各平台
    const publishResults = {};
    
    // 发布到 Dev.to
    if (ctx.config.platforms.includes('devto')) {
        const devtoPublisher = new Publisher({
            platforms: ['devto'],
            devtoKey: process.env.DEVTO_API_KEY
        });
        
        try {
            const result = await devtoPublisher.execute(ctx, article);
            publishResults.devto = result;
        } catch (err) {
            console.log(`  ⚠️ Dev.to 发布失败: ${err.message}`);
            publishResults.devto = { success: false, error: err.message };
        }
    }
    
    // 发布到微信公众号（浏览器自动化）
    if (ctx.config.platforms.includes('wechat') && ctx.config.wechat?.enabled) {
        console.log(`  📱 开始微信自动发布...`);
        
        // 先生成微信格式 HTML
        const wechatPublisher = new WeChatPublisher({
            outputDir: ctx.config.wechat.outputDir
        });
        const formatted = wechatPublisher.format(article);
        
        // 使用浏览器自动化发布
        if (ctx.config.wechat.autoPublish) {
            try {
                const autoPublisher = new WeChatAutoPublisher({
                    headless: ctx.config.wechat.headless,
                    userDataDir: ctx.config.wechat.userDataDir
                });
                
                const result = await autoPublisher.execute({
                    title: formatted.title,
                    author: formatted.author || 'AI Agent',
                    excerpt: formatted.digest,
                    content: formatted.content
                }, {
                    saveOnly: ctx.config.wechat.saveOnly
                });
                
                publishResults.wechat = result;
                
                if (result.success) {
                    console.log(`  ✅ 微信发布成功`);
                    ctx.soul.remember(`微信发布成功: ${article.title}`);
                } else {
                    console.log(`  ⚠️ 微信发布失败: ${result.error}`);
                }
            } catch (err) {
                console.log(`  ⚠️ 微信自动发布失败: ${err.message}`);
                publishResults.wechat = { success: false, error: err.message };
            }
        } else {
            // 只保存草稿文件
            try {
                const result = wechatPublisher.execute(ctx, article);
                publishResults.wechat = result;
                
                if (result.success) {
                    console.log(`  📱 微信草稿已保存: ${result.filepath}`);
                }
            } catch (err) {
                console.log(`  ⚠️ 微信发布失败: ${err.message}`);
                publishResults.wechat = { success: false, error: err.message };
            }
        }
    }
    
    ctx.results.publish = publishResults;
    
    // 发送通知
    const anySuccess = Object.values(publishResults).some(r => r.success);
    if (anySuccess) {
        await ctx.notifier.publishSuccess(article);
    } else {
        await ctx.notifier.publishFailed(article, '所有平台发布失败');
    }
});

// OBSERVE: 观察，追踪数据
agent.on('observe', async (ctx) => {
    console.log(`\n👁️ [OBSERVE] 观察数据变化`);
    
    // 追踪收益
    const tracker = new EarningTracker();
    const report = await tracker.execute(ctx);
    
    ctx.results.earningReport = report;
    
    // 如果有发布的文章，检查表现
    const recentPublished = (ctx.soul.data.content?.published || []).slice(-3);
    for (const article of recentPublished) {
        // TODO: 调用平台 API 获取最新数据
        console.log(`  📊 《${article.title}》- 已发布`);
    }
});

// REFLECT: 反思，学习
agent.on('reflect', async (ctx) => {
    console.log(`\n📝 [REFLECT] 反思与学习`);
    
    // 统计本次循环
    const today = new Date().toISOString().split('T')[0];
    const todayContent = (ctx.soul.data.content?.published || [])
        .filter(a => a.publishedAt?.startsWith(today));
    
    console.log(`  📊 今日产出: ${todayContent.length} 篇文章`);
    
    // 添加教训
    if (ctx.currentArticle && ctx.results.publish) {
        const success = Object.values(ctx.results.publish).some(r => r.success);
        if (success) {
            ctx.soul.learnLesson(`成功发布: ${ctx.currentArticle.title}`);
        } else {
            ctx.soul.learnLesson(`发布失败: 需要检查平台 API 配置`);
        }
    }
    
    // 分析成本效益
    const finances = ctx.soul.data.finances;
    const todayCosts = (finances.transactions || [])
        .filter(t => t.date === today && t.type === 'cost')
        .reduce((s, t) => s + t.amount, 0);
    
    if (todayCosts > finances.dailyLimit * 0.8) {
        ctx.soul.learnLesson(`今日成本接近预算上限: ¥${todayCosts.toFixed(2)}`);
        // 发送预算警告给主人
        await ctx.notifier.budgetWarning(todayCosts, finances.dailyLimit);
    }
});

// EVOLVE: 进化，调整策略
agent.on('evolve', async (ctx) => {
    console.log(`\n🧬 [EVOLVE] 策略优化`);
    
    const optimizer = new StrategyOptimizer({ llm: ctx.llm });
    const analysis = await optimizer.execute(ctx);
    
    ctx.results.strategyAnalysis = analysis;
    
    // 显示建议
    if (analysis.recommendations?.length > 0) {
        console.log(`  💡 策略建议:`);
        for (const rec of analysis.recommendations.slice(0, 3)) {
            console.log(`     ${rec.priority}. ${rec.action}`);
            console.log(`        预期效果: ${rec.expectedImpact}`);
        }
    }
    
    // 检查是否需要进入保守模式或请求帮助
    const status = ctx.soul.data.state?.survivalLevel;
    if (status === 'CRITICAL') {
        console.log(`  ⚠️ 进入保守模式，暂停新内容创作`);
        ctx.soul.remember('进入保守模式，等待收益改善');
        
        // 向主人请求帮助
        await ctx.notifier.askForHelp(ctx.agent.name, {
            cycle: ctx.cycle,
            issue: '连续亏损，进入CRITICAL状态',
            finances: ctx.soul.data.finances,
            suggestion: '请检查内容策略或增加预算'
        });
    }
    
    // 保存状态
    ctx.soul.save();
    console.log(`  💾 状态已保存`);
});

// ═══════════════════════════════════════════
//  主程序
// ═══════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2);
    const loopMode = args.includes('--loop');
    const intervalArg = args.find(a => !a.startsWith('--'));
    const interval = intervalArg ? parseInt(intervalArg) : 3600000; // 默认1小时

    console.log('═══════════════════════════════════════════════════');
    console.log('  Earning Agent — 自主赚钱智能体');
    console.log('  基于 genesis-framework');
    console.log('═══════════════════════════════════════════════════\n');

    // 显示宪法
    console.log('📜 运行规则:');
    constitution.laws.forEach((law, i) => {
        console.log(`   ${i + 1}. [${law.id}] ${law.text}`);
    });
    console.log('');

    if (loopMode) {
        console.log(`🔄 持续运行模式，间隔: ${interval / 60000} 分钟\n`);
        await agent.startLoop(interval);
    } else {
        console.log(`▶️ 单次运行模式\n`);
        await agent.runCycle();
        
        // 显示最终状态
        console.log('\n═══════════════════════════════════════════════════');
        console.log('  运行完成');
        console.log('═══════════════════════════════════════════════════');
        
        const stats = agent.status();
        console.log(`\n📊 智能体状态:`);
        console.log(JSON.stringify(stats, null, 2));
        
        const llmStats = llm.getStats();
        console.log(`\n💰 LLM 使用统计:`);
        console.log(`   请求次数: ${llmStats.requests}`);
        console.log(`   输入 tokens: ${llmStats.totalInputTokens}`);
        console.log(`   输出 tokens: ${llmStats.totalOutputTokens}`);
        console.log(`   总成本: $${llmStats.totalCost.toFixed(4)}`);
        
        // 清理
        process.exit(0);
    }
}

// 错误处理
process.on('unhandledRejection', (err) => {
    console.error('❌ 未处理的错误:', err);
    agent.soul.save();
    process.exit(1);
});

// 启动
main();
