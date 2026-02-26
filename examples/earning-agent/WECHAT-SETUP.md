# 微信公众号自动发布配置指南

## 前提条件

### 1. 安装 Playwright 浏览器

```bash
cd examples/earning-agent
npx playwright install chromium
```

> **注意**：首次安装约需下载 150MB，请确保网络通畅。

### 2. 服务器环境（无显示器）

如果你在服务器上运行（没有图形界面），需要安装依赖：

```bash
# Ubuntu/Debian
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2

# 然后使用 headless 模式
# 但首次登录需要扫码，建议在本地先登录保存状态
```

### 3. 首次登录（必须）

首次运行需要显示浏览器窗口扫码登录：

```bash
# 本地电脑（有显示器）
node test-wechat-publish.js

# 扫码登录后，状态会保存在 data/wechat-browser/auth.json
```

## 使用方式

### 方式一：完全自动化（推荐）

```javascript
// 配置 index.js
wechat: {
    enabled: true,
    autoPublish: true,    // 启用自动发布
    headless: true,       // 后续运行可无头模式
    saveOnly: false       // 直接发布（需群发权限）
}
```

### 方式二：只保存草稿

```javascript
wechat: {
    enabled: true,
    autoPublish: true,
    headless: true,
    saveOnly: true        // 只保存草稿，人工审核后发布
}
```

### 方式三：手动复制

如果无法使用浏览器自动化：

```javascript
wechat: {
    enabled: true,
    autoPublish: false,   // 只生成 HTML 文件
    outputDir: './data/wechat-drafts'
}
```

然后手动复制内容到公众号后台。

## 工作流程

```
┌────────────────────────────────────────────────────────────┐
│                    微信自动发布流程                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Agent 生成文章                                         │
│       ↓                                                    │
│  2. 格式化为微信 HTML                                       │
│       ↓                                                    │
│  3. 启动浏览器                                             │
│       ↓                                                    │
│  4. 检查登录状态                                           │
│       ├─ 已登录 → 继续                                     │
│       └─ 未登录 → 弹出窗口，等待扫码                        │
│       ↓                                                    │
│  5. 打开公众号后台                                         │
│       ↓                                                    │
│  6. 创建新图文                                             │
│       ↓                                                    │
│  7. 填入标题、内容                                         │
│       ↓                                                    │
│  8. 保存草稿 / 发布                                        │
│       ↓                                                    │
│  9. 关闭浏览器                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 注意事项

### 发布频率限制

| 公众号类型 | 每天群发次数 | 草稿数量 |
|-----------|------------|---------|
| 个人订阅号 | 1 次 | 无限制 |
| 认证订阅号 | 1 次 | 无限制 |
| 服务号 | 4 次 | 无限制 |

**建议**：设置 `saveOnly: true`，保存为草稿后由人工决定是否发布。

### 登录状态有效期

- 登录状态通常可保持 **7-30 天**
- 过期后需要重新扫码
- 状态保存在 `data/wechat-browser/auth.json`

### 安全建议

1. **不要提交登录状态文件**到 Git
2. 定期更换密码后需重新登录
3. 在可信环境中运行

## 故障排除

### 浏览器启动失败

```bash
# 安装依赖
sudo apt-get install -y $(cat <<EOF
libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 
libgbm1 libasound2 libxshmfence1 libxcomposite1
libxcursor1 libxdamage1 libxfixes3 libxi6 libxtst6
EOF
)
```

### 找不到元素

微信后台页面结构可能变化，需要更新 `wechat-auto-publisher.js` 中的选择器。

### 登录超时

首次登录等待时间为 2 分钟，如果不够可以修改：

```javascript
// 在 wechat-auto-publisher.js 中
await this.page.waitForURL('**/cgi-bin/home**', {
    timeout: 180000  // 改为 3 分钟
});
```

## 测试命令

```bash
# 测试微信自动发布
npm run wechat-test

# 或直接运行
node test-wechat-publish.js
```
