/**
 * Earning Agent Test — 模拟测试
 * 
 * 不需要真实 API Key，模拟整个流程
 * 运行: node test-agent.js
 */

const { Agent, Soul } = require('../../index');
const { EnhancedConstitution } = require('./lib/constitution');
const { WeChatFormatter } = require('./lib/wechat-formatter');

// 模拟 LLM（不调用真实 API）
class MockLLM {
    constructor() {
        this.stats = { requests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 };
    }
    
    async chat(prompt, options = {}) {
        this.stats.requests++;
        this.stats.totalInputTokens += 500;
        this.stats.totalOutputTokens += 1000;
        this.stats.totalCost += 0.05;
        
        // 模拟返回热点分析
        if (prompt.includes('分析') || prompt.includes('热点')) {
            return {
                content: JSON.stringify([
                    { rank: 1, index: 1, reason: '高热度技术话题', angle: '深入教程' },
                    { rank: 2, index: 2, reason: '读者兴趣高', angle: '实战案例' }
                ]),
                cost: 0.02
            };
        }
        
        // 模拟返回文章
        return {
            content: `# AI Agent 开发实战指南

AI Agent（人工智能代理）是当前最热门的技术方向之一。本文将带你从零开始构建一个完整的 AI Agent。

## 什么是 AI Agent？

AI Agent 是一种能够自主决策、执行任务的智能系统。它具备以下核心能力：

- **感知能力**：理解环境和用户需求
- **推理能力**：基于信息做出决策
- **执行能力**：调用工具完成任务
- **学习能力**：从经验中持续改进

\`\`\`javascript
// 简单的 Agent 示例
class SimpleAgent {
    constructor(name) {
        this.name = name;
        this.memory = [];
    }
    
    async think(input) {
        // 思考过程
        return this.decide(input);
    }
    
    async act(decision) {
        // 执行动作
        return this.execute(decision);
    }
}
\`\`\`

## 架构设计

一个完整的 AI Agent 通常包含以下组件：

| 组件 | 功能 |
|------|------|
| Soul | 持久化记忆 |
| Constitution | 行为规则 |
| Skills | 功能模块 |
| LifeCycle | 生命周期 |

## 最佳实践

1. **保持简单** - 从小处着手，逐步扩展
2. **重视记忆** - 持久化是智能的基础
3. **明确边界** - 用宪法约束行为

---

希望这篇文章对你有所帮助！`,
            cost: 0.08
        };
    }
    
    getStats() {
        return this.stats;
    }
}

// ═══════════════════════════════════════════
//  测试开始
// ═══════════════════════════════════════════

console.log('═══════════════════════════════════════════════════');
console.log('  Earning Agent — 模拟测试');
console.log('═══════════════════════════════════════════════════\n');

async function runTest() {
    // 1. 初始化
    console.log('📋 Step 1: 初始化 Agent...');
    
    const constitution = EnhancedConstitution.earningAgent();
    const mockLLM = new MockLLM();
    
    const agent = new Agent({
        name: 'TestAgent',
        soulPath: './data/test-soul.json'
    });
    agent.constitution = constitution;
    
    console.log(`  ✅ Agent: ${agent.name}`);
    console.log(`  ✅ Constitution: ${constitution.laws.length} 条规则`);
    
    // 2. 初始化 Soul 扩展
    console.log('\n📋 Step 2: 初始化 Soul 扩展...');
    
    agent.soul.data.finances = {
        totalEarnings: 0,
        totalCosts: 0,
        dailyLimit: 20,
        transactions: []
    };
    agent.soul.data.content = {
        published: [],
        drafts: [],
        ideas: []
    };
    agent.soul.data.topics = {
        watching: ['AI', 'programming'],
        blacklist: ['政治'],
        expertise: ['技术教程']
    };
    
    console.log(`  ✅ Soul 扩展已初始化`);
    
    // 3. 模拟热点监控
    console.log('\n📋 Step 3: 模拟热点监控...');
    
    const mockTrends = [
        { topic: 'AI Agent 开发实战', score: 500, source: 'hackernews' },
        { topic: 'Claude 3.5 新特性', score: 400, source: 'reddit' },
        { topic: 'JavaScript 异步编程', score: 300, source: 'hackernews' }
    ];
    
    console.log(`  ✅ 发现 ${mockTrends.length} 个热点`);
    mockTrends.forEach((t, i) => {
        console.log(`     ${i + 1}. ${t.topic} (热度: ${t.score})`);
    });
    
    // 4. 模拟文章生成
    console.log('\n📋 Step 4: 模拟文章生成...');
    
    const selectedTopic = mockTrends[0];
    const articleResponse = await mockLLM.chat('write article');
    
    const article = {
        title: selectedTopic.topic,
        content: articleResponse.content,
        tags: ['AI', 'programming', 'tutorial'],
        excerpt: 'AI Agent 开发实战指南，从零开始构建智能系统...'
    };
    
    console.log(`  ✅ 文章已生成: ${article.title}`);
    console.log(`  ✅ 内容长度: ${article.content.length} 字符`);
    
    // 5. 微信格式化
    console.log('\n📋 Step 5: 微信公众号格式化...');
    
    const formatter = new WeChatFormatter();
    const wechatHTML = formatter.format(article.content, {
        title: article.title,
        author: 'AI Agent'
    });
    
    console.log(`  ✅ HTML 长度: ${wechatHTML.length} 字符`);
    
    // 6. 保存草稿
    console.log('\n📋 Step 6: 保存草稿...');
    
    const fs = require('fs');
    const draftDir = './data/wechat-drafts';
    if (!fs.existsSync(draftDir)) {
        fs.mkdirSync(draftDir, { recursive: true });
    }
    
    const draftPath = `${draftDir}/test-article-${Date.now()}.html`;
    formatter.toFile(wechatHTML, draftPath);
    
    console.log(`  ✅ 草稿已保存: ${draftPath}`);
    
    // 7. 记录成本
    console.log('\n📋 Step 7: 记录成本...');
    
    const llmStats = mockLLM.getStats();
    agent.soul.data.finances.transactions.push({
        date: new Date().toISOString().split('T')[0],
        type: 'cost',
        amount: llmStats.totalCost,
        desc: 'LLM API 调用'
    });
    agent.soul.data.finances.totalCosts = llmStats.totalCost;
    
    console.log(`  ✅ API 调用: ${llmStats.requests} 次`);
    console.log(`  ✅ 总成本: $${llmStats.totalCost.toFixed(4)}`);
    
    // 8. Constitution 检查
    console.log('\n📋 Step 8: Constitution 检查...');
    
    const budgetCheck = constitution.check(
        { type: 'spend', amount: 5 },
        { soul: agent.soul }
    );
    console.log(`  ✅ 预算检查: ${budgetCheck.allowed ? '通过' : '未通过'}`);
    
    const qualityCheck = constitution.check(
        { type: 'publish', title: article.title, content: article.content },
        { soul: agent.soul }
    );
    console.log(`  ✅ 质量检查: ${qualityCheck.allowed ? '通过' : '未通过'}`);
    
    // 9. 记录发布
    console.log('\n📋 Step 9: 记录发布...');
    
    agent.soul.data.content.published.push({
        id: `art_${Date.now()}`,
        title: article.title,
        publishedAt: new Date().toISOString(),
        platforms: [{ name: 'wechat', draftPath: draftPath }]
    });
    
    agent.soul.remember(`发布文章: ${article.title}`);
    agent.soul.save();
    
    console.log(`  ✅ 已记录到 Soul`);
    
    // 10. 总结
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  测试完成！');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📊 测试结果:');
    console.log(`  - Agent 状态: ${agent.status().name}`);
    console.log(`  - Soul 周期: ${agent.soul.cycle}`);
    console.log(`  - 发布文章: ${agent.soul.data.content.published.length} 篇`);
    console.log(`  - 总成本: $${agent.soul.data.finances.totalCosts.toFixed(4)}`);
    console.log(`  - 记忆条数: ${agent.soul.data.memory.length}`);
    
    console.log('\n📁 生成的文件:');
    console.log(`  - Soul: ./data/test-soul.json`);
    console.log(`  - 微信草稿: ${draftPath}`);
    
    console.log('\n✅ 所有模块测试通过！');
    
    // 清理测试文件
    // fs.unlinkSync('./data/test-soul.json');
}

runTest().catch(err => {
    console.error('❌ 测试失败:', err);
    process.exit(1);
});
