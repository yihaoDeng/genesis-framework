/**
 * 微信公众号自动发布测试
 * 
 * 运行: node test-wechat-publish.js
 * 
 * 首次运行会打开浏览器窗口，需要扫码登录
 * 登录状态会保存在 data/wechat-browser/auth.json
 */

const { WeChatAutoPublisher, checkLoginStatus } = require('./skills/wechat-auto-publisher');
const { WeChatFormatter } = require('./lib/wechat-formatter');

async function test() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  微信公众号自动发布测试');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. 检查登录状态
    console.log('📋 Step 1: 检查登录状态...');
    const status = await checkLoginStatus();
    console.log(`  ${status.loggedIn ? '✅' : '⚠️'} ${status.message}`);

    // 2. 准备测试文章
    console.log('\n📋 Step 2: 准备测试文章...');
    
    const markdown = `# AI Agent 开发实战指南

AI Agent（人工智能代理）是当前最热门的技术方向之一。

## 核心能力

- **感知能力**：理解环境和用户需求
- **推理能力**：基于信息做出决策
- **执行能力**：调用工具完成任务

\`\`\`javascript
class SimpleAgent {
    constructor(name) {
        this.name = name;
    }
    
    async think(input) {
        return this.decide(input);
    }
}
\`\`\`

## 最佳实践

1. 保持简单
2. 重视记忆
3. 明确边界

---

*本文由 AI Agent 自动生成*`;

    const formatter = new WeChatFormatter();
    const html = formatter.format(markdown, {
        title: 'AI Agent 开发实战指南',
        author: 'AI Agent'
    });

    const article = {
        title: 'AI Agent 开发实战指南（测试）',
        author: 'AI Agent',
        excerpt: 'AI Agent 开发实战指南，从零开始构建智能系统',
        content: html
    };

    console.log(`  ✅ 文章已准备: ${article.title}`);
    console.log(`  ✅ 内容长度: ${article.content.length} 字符`);

    // 3. 执行发布
    console.log('\n📋 Step 3: 开始自动发布...');
    console.log('  💡 提示: 首次运行会打开浏览器窗口，请扫码登录\n');

    const publisher = new WeChatAutoPublisher({
        headless: false,      // 显示浏览器窗口
        slowMo: 200           // 慢速操作，便于观察
    });

    const result = await publisher.execute(article, {
        saveOnly: true        // 只保存草稿，不发布
    });

    // 4. 显示结果
    console.log('\n═══════════════════════════════════════════════════');
    if (result.success) {
        console.log('  ✅ 测试成功！');
        console.log('  📝 请登录微信公众号后台查看草稿');
    } else {
        console.log('  ❌ 测试失败');
        console.log(`  错误: ${result.error}`);
    }
    console.log('═══════════════════════════════════════════════════');
}

test().catch(err => {
    console.error('❌ 测试出错:', err);
    process.exit(1);
});
