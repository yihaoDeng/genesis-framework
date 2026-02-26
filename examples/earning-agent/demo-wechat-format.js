/**
 * WeChat Formatter Demo — 微信公众号格式化演示
 * 
 * 运行: node demo-wechat-format.js
 * 
 * 输出:
 * - 格式化后的 HTML 文件
 * - 可直接复制粘贴到公众号编辑器
 */

const { WeChatFormatter } = require('./lib/wechat-formatter');

// 示例 Markdown 文章
const sampleArticle = `
# 深入理解 JavaScript 异步编程

在 JavaScript 开发中，异步编程是一个核心概念。本文将深入探讨异步编程的演进历程。

## 回调函数时代

早期的 JavaScript 异步处理主要依赖回调函数：

\`\`\`javascript
function fetchData(callback) {
    setTimeout(() => {
        callback(null, { data: 'Hello World' });
    }, 1000);
}

fetchData((err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(data);
});
\`\`\`

> 回调地狱（Callback Hell）是开发者经常面临的问题，代码可读性极差。

## Promise 的诞生

ES6 引入了 Promise，让异步代码更加优雅：

\`\`\`javascript
function fetchData() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({ data: 'Hello World' });
        }, 1000);
    });
}

fetchData()
    .then(data => console.log(data))
    .catch(err => console.error(err));
\`\`\`

### Promise 链式调用

Promise 的强大之处在于链式调用：

\`\`\`python
# Python 示例对比
async def fetch_data():
    response = await aiohttp.get(url)
    return await response.json()
\`\`\`

## Async/Await 革命

ES2017 带来了 async/await，让异步代码看起来像同步代码：

| 特性 | Promise | Async/Await |
|------|---------|-------------|
| 可读性 | 中等 | 优秀 |
| 错误处理 | .catch() | try/catch |
| 调试体验 | 一般 | 优秀 |

## 最佳实践

1. **优先使用 async/await** - 代码更清晰
2. **合理处理错误** - 不要忽略异常
3. **避免并发问题** - 使用 Promise.all

---

希望这篇文章对你有所帮助！

*关注公众号，获取更多技术干货*
`;

console.log('═══════════════════════════════════════════════════');
console.log('  微信公众号格式化演示');
console.log('═══════════════════════════════════════════════════\n');

// 使用格式化器
const formatter = new WeChatFormatter({
    fontSize: 16,
    lineHeight: 1.75
});

const result = formatter.format(sampleArticle, {
    title: '深入理解 JavaScript 异步编程',
    author: 'AI Agent'
});

// 保存到文件
const fs = require('fs');
const outputDir = './data/wechat-drafts';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const filename = formatter.toFile(result, `${outputDir}/demo-article.html`);

console.log(`✅ 格式化完成！`);
console.log(`📄 HTML 文件: ${filename}`);
console.log(`📊 内容长度: ${result.length} 字符\n`);

// 显示部分结果
console.log('═══════════════════════════════════════════════════');
console.log('  HTML 预览 (前 1000 字符)');
console.log('═══════════════════════════════════════════════════\n');
console.log(result.slice(0, 1000) + '...\n');

// 使用快速格式化
console.log('═══════════════════════════════════════════════════');
console.log('  快速格式化示例');
console.log('═══════════════════════════════════════════════════\n');

const quick = formatter.format('这是一段**加粗**和`代码`的简单文本', { title: '测试标题' });
console.log(quick);

console.log('\n═══════════════════════════════════════════════════');
console.log('  使用方法');
console.log('═══════════════════════════════════════════════════');
console.log(`
1. 打开生成的 HTML 文件
2. 复制 <section>...</section> 中的内容
3. 粘贴到微信公众号后台编辑器
4. 根据需要调整封面图和其他设置

或者直接在程序中获取 clipboardReady 内容粘贴。
`);
