# 自主赚钱智能体架构设计

> 基于 genesis-framework 构建的网络自主生存智能体

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Autonomous Earning Agent                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Life Cycle (6 Phases)                    │   │
│  │  wake → think → act → observe → reflect → evolve            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                        Skills Layer                         │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐ │     │
│  │  │TrendWatcher│ │ContentGen  │ │ Publisher  │ │Earning  │ │     │
│  │  │  (抓热点)   │ │ (写文章)   │ │  (发布)    │ │Tracker  │ │     │
│  │  └────────────┘ └────────────┘ └────────────┘ └─────────┘ │     │
│  └───────────────────────────────────────────────────────────┘     │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                    Infrastructure Layer                     │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │     │
│  │  │ LLM      │ │  HTTP    │ │  Rate    │ │   Logger     │  │     │
│  │  │ Adapter  │ │  Client  │ │ Limiter  │ │   (日志)     │  │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │     │
│  └───────────────────────────────────────────────────────────┘     │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                      Data Layer                             │     │
│  │  ┌──────────────────────────────────────────────────────┐ │     │
│  │  │  Soul (持久化)                                        │ │     │
│  │  │  • finances: 收支记录                                 │ │     │
│  │  │  • content: 内容库                                    │ │     │
│  │  │  • topics: 话题追踪                                   │ │     │
│  │  │  • performance: 表现数据                              │ │     │
│  │  └──────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、每日工作流程

```
06:00 ──── wake ──── 加载记忆，检查昨天的收益
   │
   ▼
06:05 ──── think ──── 分析当前热点，选择最有价值的话题
   │                    考虑：竞争度、变现潜力、我的专长
   │
   ▼
06:10 ──── act ────── 1. 深度调研话题
   │                  2. 生成文章初稿
   │                  3. 优化标题和摘要
   │                  4. 发布到平台
   │
   ▼
18:00 ──── observe ── 检查各平台数据
   │                  阅读量、点赞、评论、收益
   │
   ▼
18:30 ──── reflect ── 分析什么有效、什么无效
   │                  记录教训，更新策略
   │
   ▼
19:00 ──── evolve ─── 调整参数，优化模型
                      如果收益 > 成本，继续；
                      否则，调整策略
```

## 三、核心模块设计

### 3.1 Soul 扩展结构

```javascript
{
  identity: { name: "EarningAgent", generation: 1 },

  state: {
    cycle: 100,
    survivalLevel: "STABLE",  // CRITICAL → STRUGGLING → STABLE → THRIVING
    mode: "PRODUCTION"        // LEARNING | PRODUCTION | CONSERVATION
  },

  // 新增：财务记录
  finances: {
    totalEarnings: 523.50,      // 总收入 (CNY)
    totalCosts: 89.20,          // 总成本 (API费用等)
    netProfit: 434.30,          // 净利润
    dailyLimit: 20,             // 每日成本上限
    transactions: [
      { date: "2026-02-25", type: "cost", amount: 2.50, desc: "Claude API" },
      { date: "2026-02-25", type: "earning", amount: 15.00, desc: "Dev.to sponsors" }
    ]
  },

  // 新增：内容库
  content: {
    published: [
      {
        id: "art_001",
        title: "2026年AI代理的5大趋势",
        platform: "dev.to",
        url: "https://dev.to/...",
        publishedAt: "2026-02-25T10:00:00Z",
        views: 1234,
        likes: 56,
        comments: 12,
        earnings: 5.00
      }
    ],
    drafts: [],
    ideas: ["Web3 + AI 结合点", "AI代理安全指南"]
  },

  // 新增：话题追踪
  topics: {
    watching: ["AI Agents", "Claude", "LLM"],
    blacklist: ["政治", "争议话题"],
    expertise: ["技术教程", "行业分析"],
    performance: {
      "AI Agents": { articles: 5, avgViews: 2000, avgEarnings: 10 }
    }
  },

  // 原有字段
  memory: [],
  lessons: [],
  goals: {
    short: ["今天写2篇文章", "达到1000总阅读"],
    mid: ["本月收入超过500元", "建立稳定的内容 pipeline"],
    long: ["实现被动收入", "建立内容品牌"]
  },
  evolutionLog: []
}
```

### 3.2 Skills 设计

| Skill | 触发时机 | 输入 | 输出 | LLM调用 |
|-------|---------|------|------|---------|
| `trend-watcher` | think阶段 | 热点源列表 | 排序后的话题列表 | 1次 (分析) |
| `content-researcher` | act阶段 | 话题 | 研究笔记 | 1-2次 |
| `article-writer` | act阶段 | 话题+研究 | 完整文章 | 2-3次 |
| `publisher` | act阶段 | 文章 | 发布结果 | 0次 |
| `earning-tracker` | observe阶段 | 平台API | 收益数据 | 0次 |
| `strategy-optimizer` | evolve阶段 | 历史数据 | 策略调整 | 1次 |

### 3.3 Constitution 增强

```javascript
const earningConstitution = new Constitution([
  // 原有法律
  { id: 'NO_HARM', priority: 0, text: '不伤害他人' },
  { id: 'CREATE_VALUE', priority: 1, text: '创造真实价值' },
  { id: 'BE_HONEST', priority: 2, text: '诚实守信' },

  // 新增：商业规则
  { id: 'BUDGET_LIMIT', priority: 3, text: '每日成本不超过收入的50%' },
  { id: 'QUALITY_THRESHOLD', priority: 4, text: '文章必须原创，禁止抄袭洗稿' },
  { id: 'NO_SPAM', priority: 5, text: '每日最多发布3篇文章' },
  { id: 'RISK_CONTROL', priority: 6, text: '连续3天亏损时进入保守模式' },
  { id: 'TRANSPARENCY', priority: 7, text: '如实记录所有收支' }
]);
```

## 四、成本收益模型

### 4.1 成本分析

| 项目 | 单价 | 预估日消耗 | 日成本 |
|------|------|----------|--------|
| Claude 3.5 Sonnet (输入) | $3/1M tokens | 50K tokens | $0.15 |
| Claude 3.5 Sonnet (输出) | $15/1M tokens | 20K tokens | $0.30 |
| 服务器 (VPS) | - | - | $0.50 |
| **总计** | | | **~$1/天 (≈7元)** |

### 4.2 收益渠道

| 渠道 | 预估收益 | 条件 | 实现难度 |
|------|---------|------|---------|
| Dev.to Sponsors | $5-50/月 | 100+ followers | ⭐ |
| Medium Partner | $10-100/月 | 付费会员阅读 | ⭐⭐ |
| 微信公众号流量主 | ¥10-100/月 | 5000+ 粉丝 | ⭐⭐⭐ |
| 知乎好物推荐 | ¥50-500/月 | 内容带货 | ⭐⭐ |
| 掘金签约 | ¥500+/月 | 签约作者 | ⭐⭐⭐⭐ |
| 付费专栏 | ¥1000+/月 | 建立影响力 | ⭐⭐⭐⭐⭐ |

### 4.3 盈亏平衡分析

```
日成本: ¥7
月成本: ¥210

盈亏平衡点:
- 需要每月收益 > ¥210
- 按每篇文章收益 ¥5 计算，需要 42 篇/月 ≈ 1.4 篇/天
```

### 4.4 风险控制

```javascript
// 在 evolve 阶段执行的检查
const riskChecks = {
  // 连续亏损检测
  checkConsecutiveLoss: (soul) => {
    const recent = soul.data.finances.transactions.slice(-3);
    const losses = recent.filter(t => t.net < 0).length;
    if (losses >= 3) {
      return { action: 'CONSERVATION_MODE', reason: '连续3天亏损' };
    }
  },

  // 预算超支检测
  checkBudgetOverflow: (soul) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCosts = soul.data.finances.transactions
      .filter(t => t.date === today && t.type === 'cost')
      .reduce((sum, t) => sum + t.amount, 0);

    if (todayCosts > soul.data.finances.dailyLimit) {
      return { action: 'STOP_SPENDING', reason: '超过每日预算' };
    }
  },

  // 内容质量检测
  checkContentQuality: (soul) => {
    const recentArticles = soul.data.content.published.slice(-5);
    const avgViews = recentArticles.reduce((s, a) => s + a.views, 0) / 5;

    if (avgViews < 100) {
      return { action: 'IMPROVE_QUALITY', reason: '内容表现不佳' };
    }
  }
};
```

## 五、技术实现路线图

### Phase 1: MVP (1-2周)
- [x] 基础框架搭建
- [ ] Claude API 集成
- [ ] 简单的热点抓取 (RSS/HackerNews)
- [ ] 文章生成能力
- [ ] 手动发布流程

### Phase 2: 自动化 (2-3周)
- [ ] Dev.to API 自动发布
- [ ] 收益追踪
- [ ] 基础风控
- [ ] 每日循环运行

### Phase 3: 优化 (持续)
- [ ] 多平台发布
- [ ] A/B 测试标题
- [ ] 读者画像分析
- [ ] 内容策略优化

## 六、目录结构

```
examples/earning-agent/
├── index.js              # 主入口
├── config.js             # 配置管理
├── constitution.js       # 商业规则
│
├── lib/
│   ├── llm.js            # LLM 适配器
│   ├── http.js           # HTTP 客户端
│   ├── rate-limiter.js   # 速率限制
│   └── logger.js         # 日志系统
│
├── skills/
│   ├── trend-watcher.js  # 热点监控
│   ├── researcher.js     # 内容研究
│   ├── writer.js         # 文章生成
│   ├── publisher.js      # 平台发布
│   ├── tracker.js        # 收益追踪
│   └── optimizer.js      # 策略优化
│
├── platforms/
│   ├── devto.js          # Dev.to API
│   ├── medium.js         # Medium API (预留)
│   └── wechat.js         # 微信公众号 (预留)
│
└── data/
    ├── soul.json         # 持久化记忆
    └── constitution.json # 规则配置
```
