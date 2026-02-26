# Earning Agent — 完全自主赚钱智能体

> **一个真正自主的 AI Agent**：自动抓热点、写文章、发布微信公众号、追踪收益，需要帮助时微信通知你。

## 🚀 快速开始

```bash
# 1. 安装
npm install
npx playwright install chromium

# 2. 配置
export ANTHROPIC_API_KEY="你的Claude API Key"
export SERVERCHAN_KEY="你的Server酱Key"  # 可选，用于接收通知

# 3. 首次登录微信（会打开浏览器扫码）
npm run wechat-test

# 4. 启动
npm run loop
```

## 📚 完整文档

详见 **[USAGE.md](./USAGE.md)**，包含：

- 详细配置指南
- 所有功能说明
- 成本收益分析
- 常见问题解答

## 📁 项目结构

```
earning-agent/
├── index.js              # 主入口
├── config.js             # 配置
│
├── lib/                  # 基础设施
│   ├── llm.js            # Claude API
│   ├── notifier.js       # 消息推送
│   └── wechat-formatter.js # 微信格式化
│
├── skills/               # 技能模块
│   ├── trend-watcher.js  # 热点监控
│   ├── article-writer.js # 文章生成
│   ├── wechat-auto-publisher.js # 微信发布
│   └── earning-tracker.js # 收益追踪
│
└── data/                 # 数据（自动生成）
    └── soul.json         # Agent 记忆
```

## ⚡ 命令速查

```bash
npm run test          # 模拟测试（不需要 API）
npm run demo          # 微信格式化演示
npm run notify-test   # 测试通知功能
npm run wechat-test   # 测试微信发布
npm start             # 单次运行
npm run loop          # 持续运行
```

## 🔑 获取 API Key

| 服务 | 用途 | 获取地址 |
|------|------|---------|
| Claude | 文章生成 | [Anthropic Console](https://console.anthropic.com/) |
| Server酱 | 微信通知 | [sct.ftqq.com](https://sct.ftqq.com/) |

## 📄 更多文档

- [USAGE.md](./USAGE.md) - 完整使用指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计
- [WECHAT-SETUP.md](./WECHAT-SETUP.md) - 微信发布配置

## License

MIT
