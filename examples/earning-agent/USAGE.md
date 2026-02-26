# Earning Agent — 完全自主赚钱智能体

> **一个真正自主的 AI Agent**：自动抓热点、写文章、发布到微信公众号、追踪收益，需要帮助时给你发微信通知。

---

## 目录

1. [项目概述](#项目概述)
2. [快速开始](#快速开始)
3. [配置指南](#配置指南)
4. [核心功能](#核心功能)
5. [运行方式](#运行方式)
6. [文件结构](#文件结构)
7. [成本收益分析](#成本收益分析)
8. [常见问题](#常见问题)

---

## 项目概述

### 这是什么？

Earning Agent 是一个基于 genesis-framework 构建的自主智能体，能够：

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🔍 抓热点     →     ✍️ 写文章     →     📱 发布     →     💰 赚钱    │
│                                                             │
│   HackerNews          Claude API         微信公众号        追踪收益      │
│   Reddit              自动生成           浏览器自动化      成本控制      │
│                                                             │
│                         🆘 需要帮助时 → 微信通知你                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心特性

| 特性 | 说明 |
|------|------|
| **完全自主** | 设置好后无需人工干预 |
| **持续运行** | 定时循环执行任务 |
| **智能决策** | 自动选择热点话题、优化策略 |
| **风险控制** | 预算限制、发布频率控制、自动降级 |
| **通知机制** | Agent 需要帮助时主动通知你 |
| **记忆持久** | 跨会话保持学习和经验 |

### 技术架构

```
┌─────────────────────────────────────────────┐
│              Earning Agent                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         生命周期 (6 阶段)            │   │
│  │  wake → think → act → observe       │   │
│  │              ↓                       │   │
│  │         reflect → evolve            │   │
│  └─────────────────────────────────────┘   │
│                    │                        │
│  ┌─────────────────┴─────────────────┐     │
│  │              技能层                │     │
│  │  TrendWatcher  ArticleWriter      │     │
│  │  WeChatPublisher  EarningTracker  │     │
│  │  StrategyOptimizer  Notifier      │     │
│  └───────────────────────────────────┘     │
│                    │                        │
│  ┌─────────────────┴─────────────────┐     │
│  │             基础设施               │     │
│  │  LLMAdapter  HttpClient  WeChat   │     │
│  │  Constitution  Soul  Playwright   │     │
│  └───────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 快速开始

### 前提条件

- Node.js 18+
- Claude API Key（[获取地址](https://console.anthropic.com/)）
- 微信公众号（任何类型都可以）

### 1. 安装

```bash
# 克隆或复制项目
cd earning-agent

# 安装依赖
npm install

# 安装浏览器（用于微信自动发布）
npx playwright install chromium
```

### 2. 配置

```bash
# 创建配置文件
cat > .env << 'EOF'
# 必需
ANTHROPIC_API_KEY=你的Claude API Key

# 推荐（用于接收通知）
SERVERCHAN_KEY=你的Server酱SendKey
EOF
```

### 3. 首次运行

```bash
# 测试基本功能（不需要 API）
npm run test

# 测试微信格式化
npm run demo

# 测试通知功能（需要 SERVERCHAN_KEY）
npm run notify-test

# 测试微信发布（会打开浏览器扫码）
npm run wechat-test
```

### 4. 正式运行

```bash
# 单次运行
npm start

# 持续运行（每小时）
npm run loop

# 自定义间隔（每30分钟）
node index.js --loop 1800000
```

---

## 配置指南

### 环境变量

| 变量 | 必需 | 说明 | 获取方式 |
|------|:----:|------|---------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 密钥 | [Anthropic Console](https://console.anthropic.com/) |
| `SERVERCHAN_KEY` | ⭐ | Server酱推送 Key | [Server酱](https://sct.ftqq.com/) |
| `DEVTO_API_KEY` | ❌ | Dev.to API Key | Dev.to 设置页面 |

### 配置文件 (config.js)

```javascript
module.exports = {
    name: 'EarningAgent',
    
    // LLM 配置
    llm: {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096
    },
    
    // 平台配置
    platforms: ['wechat'],  // 'devto', 'wechat'
    
    // 微信公众号配置
    wechat: {
        enabled: true,
        autoPublish: true,     // 自动发布
        headless: false,       // 首次登录需要显示窗口
        saveOnly: true         // true=只保存草稿，false=直接发布
    },
    
    // 预算配置
    dailyBudgetLimit: 20,  // 每日成本上限 (CNY)
    maxDailyPublish: 3     // 每日发布上限
};
```

### Server酱配置（通知功能）

1. 访问 [https://sct.ftqq.com/](https://sct.ftqq.com/)
2. 微信扫码登录
3. 复制 SendKey（以 `SCT` 开头）
4. 设置环境变量：`export SERVERCHAN_KEY="SCTxxx"`

---

## 核心功能

### 1. 热点监控 (TrendWatcher)

从多个来源自动发现热门话题：

- **Hacker News** - 技术圈热点
- **Reddit** - r/programming, r/artificial 等
- 可扩展：微博、掘金等

```javascript
// 工作流程
const trends = await watcher.execute(ctx);
// → 返回 [{ topic, score, source, url }, ...]

const analyzed = await watcher.analyzeTrends(trends, llm, soul);
// → LLM 分析价值，返回排序后的话题
```

### 2. 文章生成 (ArticleWriter)

使用 Claude API 自动生成高质量文章：

```
话题 → 研究 → 大纲 → 写作 → 优化标题
```

**特点**：
- 原创内容，不抄袭
- 自动生成代码示例
- Markdown 格式
- SEO 优化标题

### 3. 微信发布 (WeChatPublisher)

#### 格式化

将 Markdown 转换为微信公众号富文本：

```javascript
const formatter = new WeChatFormatter();
const html = formatter.format(markdown, { title, author });
```

**支持的格式**：
- ✅ 标题 (H1-H4)
- ✅ 代码块 + 语法高亮
- ✅ 引用块
- ✅ 表格
- ✅ 列表
- ✅ 粗体/斜体
- ✅ 链接

#### 自动发布

使用 Playwright 浏览器自动化：

```
首次：打开浏览器 → 扫码登录 → 保存状态
后续：自动打开后台 → 填内容 → 保存草稿/发布
```

**登录状态有效期**：7-30 天

### 4. 收益追踪 (EarningTracker)

自动记录和分析收支：

```javascript
{
    totalEarnings: 523.50,   // 总收入
    totalCosts: 89.20,       // 总成本
    netProfit: 434.30,       // 净利润
    survivalLevel: "STABLE"  // 生存状态
}
```

### 5. 策略优化 (StrategyOptimizer)

根据历史数据自动调整策略：

- 分析哪些话题表现好
- 调整发布频率
- 优化成本控制
- 生成本周建议

### 6. 通知系统 (Notifier)

Agent 主动联系你的方式：

| 场景 | 通知内容 |
|------|---------|
| ✅ 发布成功 | 文章标题、平台 |
| ❌ 发布失败 | 错误原因 |
| ⚠️ 预算警告 | 支出接近上限 |
| 🆘 请求帮助 | Agent 无法处理的问题 |

---

## 运行方式

### 本地电脑运行（推荐）

```bash
# 安装
npm install
npx playwright install chromium

# 首次扫码登录
npm run wechat-test

# 正式运行
npm run loop
```

### 服务器运行

服务器需要安装浏览器依赖：

```bash
# Ubuntu/Debian
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 \
    libxkbcommon0 libgbm1 libasound2 libxcomposite1

# 安装浏览器
npx playwright install chromium

# 后台运行
nohup npm run loop > agent.log 2>&1 &
```

### 定时任务

使用 cron 定时运行：

```bash
# 编辑 crontab
crontab -e

# 每小时运行一次
0 * * * * cd /path/to/earning-agent && node index.js >> agent.log 2>&1
```

---

## 文件结构

```
earning-agent/
├── index.js                 # 主入口 - Agent 定义和生命周期
├── config.js                # 配置文件
├── package.json             # 依赖管理
│
├── lib/                     # 基础设施
│   ├── llm.js               # Claude API 适配器
│   ├── http.js              # HTTP 客户端
│   ├── rate-limiter.js      # 速率限制
│   ├── constitution.js      # 规则校验
│   ├── notifier.js          # 消息推送
│   └── wechat-formatter.js  # 微信格式化
│
├── skills/                  # 技能模块
│   ├── trend-watcher.js     # 热点监控
│   ├── article-writer.js    # 文章生成
│   ├── publisher.js         # Dev.to 发布
│   ├── wechat-publisher.js  # 微信格式化
│   ├── wechat-auto-publisher.js # 微信自动发布
│   ├── earning-tracker.js   # 收益追踪
│   └── strategy-optimizer.js # 策略优化
│
├── data/                    # 数据目录
│   ├── soul.json            # Agent 记忆（自动生成）
│   ├── wechat-browser/      # 微信登录状态
│   └── wechat-drafts/       # 微信草稿文件
│
└── test-*.js                # 测试脚本
```

---

## 成本收益分析

### 成本

| 项目 | 单价 | 每篇文章 |
|------|------|---------|
| Claude API 输入 | $3/1M tokens | ~$0.03 |
| Claude API 输出 | $15/1M tokens | ~$0.05 |
| **单篇成本** | | **~$0.08 (~¥0.6)** |

**每日成本**（3篇）：~¥1.8  
**每月成本**：~¥54

### 收益渠道

| 渠道 | 预估月收益 | 难度 | 实现方式 |
|------|-----------|:----:|---------|
| 微信流量主 | ¥10-100 | ⭐⭐ | 5000+ 粉丝 |
| 付费阅读 | ¥50-500 | ⭐⭐⭐ | 优质内容 |
| 广告合作 | ¥100-1000 | ⭐⭐⭐⭐ | 建立影响力 |

### 盈亏平衡

```
月成本: ~¥54
盈亏平衡: 每月收益 > ¥54
按每篇收益 ¥5: 需要 ~11 篇/月 (约 2-3 天一篇)
```

### 风险控制

| 机制 | 说明 |
|------|------|
| 预算限制 | 超过每日上限自动停止 |
| 发布频率 | 每天最多 3 篇 |
| 话题黑名单 | 自动过滤敏感话题 |
| 亏损保护 | 连续亏损自动进入保守模式 |

---

## 常见问题

### Q: 微信公众号没有 API，怎么自动发布？

A: 使用 Playwright 浏览器自动化，模拟人工操作。首次需要扫码登录，之后自动运行。

### Q: Agent 会在什么情况下通知我？

A:
- 发布成功/失败
- 预算接近上限
- 连续亏损进入 CRITICAL 状态
- 遇到无法自动处理的问题

### Q: 如何查看 Agent 的运行状态？

```bash
# 查看记忆
cat data/soul.json | jq '.memory[-5:]'

# 查看收益
cat data/soul.json | jq '.finances'

# 查看发布记录
cat data/soul.json | jq '.content.published'
```

### Q: 如何重置 Agent？

```bash
# 删除记忆文件
rm data/soul.json

# 下次运行时会重新初始化
```

### Q: 登录状态过期了怎么办？

```bash
# 重新运行测试，会打开浏览器扫码
npm run wechat-test
```

### Q: 想换一个话题方向？

修改 `config.js` 或直接编辑 `data/soul.json`:

```json
{
  "topics": {
    "watching": ["AI", "区块链", "Web3"],
    "expertise": ["技术教程", "行业分析"],
    "blacklist": ["政治", "争议话题"]
  }
}
```

---

## 命令速查

```bash
# 安装
npm install
npx playwright install chromium

# 测试
npm run test              # 模拟测试（不需要 API）
npm run demo              # 微信格式化演示
npm run notify-test       # 测试通知功能
npm run wechat-test       # 测试微信发布

# 运行
npm start                 # 单次运行
npm run loop              # 持续运行（每小时）
node index.js --loop 1800000  # 每30分钟

# 查看状态
cat data/soul.json | jq .
```

---

## 许可证

MIT

---

## 联系与支持

- 问题反馈：提交 GitHub Issue
- 功能建议：提交 Pull Request

**祝你早日实现被动收入！💰**
