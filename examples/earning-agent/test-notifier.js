/**
 * 通知功能测试
 * 
 * 运行前请设置环境变量:
 *   export SERVERCHAN_KEY="你的SendKey"
 * 
 * 运行: node test-notifier.js
 */

const { Notifier } = require('./lib/notifier');

async function test() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  通知功能测试');
    console.log('═══════════════════════════════════════════════════\n');

    // 检查配置
    if (!process.env.SERVERCHAN_KEY) {
        console.log('❌ 请先设置 SERVERCHAN_KEY 环境变量');
        console.log('\n获取方式:');
        console.log('1. 访问 https://sct.ftqq.com/');
        console.log('2. 微信扫码登录');
        console.log('3. 复制 SendKey');
        console.log('4. export SERVERCHAN_KEY="你的SendKey"');
        process.exit(1);
    }

    const notifier = new Notifier({
        serverchanKey: process.env.SERVERCHAN_KEY
    });

    console.log('📋 测试 1: 发送普通消息');
    const result1 = await notifier.info('测试消息', '这是一条来自 Agent 的测试消息');
    console.log(`  ${result1.success ? '✅ 成功' : '❌ 失败: ' + result1.error}`);

    console.log('\n📋 测试 2: 发送 Markdown 消息');
    const result2 = await notifier.send('Markdown 测试', `
## 标题测试

- 列表项 1
- 列表项 2

\`\`\`javascript
console.log('代码块测试');
\`\`\`

**粗体** 和 *斜体*
`);
    console.log(`  ${result2.success ? '✅ 成功' : '❌ 失败: ' + result2.error}`);

    console.log('\n📋 测试 3: 模拟请求帮助');
    const result3 = await notifier.askForHelp('TestAgent', {
        cycle: 10,
        issue: '连续3天亏损，无法自行解决',
        finances: {
            totalEarnings: 5,
            totalCosts: 50,
            netProfit: -45
        },
        suggestion: '请检查内容策略或增加预算'
    });
    console.log(`  ${result3.success ? '✅ 成功' : '❌ 失败: ' + result3.error}`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  测试完成！请检查微信是否收到消息');
    console.log('═══════════════════════════════════════════════════');
}

test().catch(err => {
    console.error('❌ 测试出错:', err);
    process.exit(1);
});
