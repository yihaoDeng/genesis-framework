/**
 * WeChat Auto Publisher — 微信公众号自动发布（浏览器自动化）
 * 
 * 使用 Playwright 模拟人工操作，实现个人订阅号的自动发布
 * 
 * 原理：
 * 1. 启动浏览器（可复用登录状态）
 * 2. 打开公众号后台
 * 3. 如果未登录，弹出二维码让用户扫码（只需一次）
 * 4. 创建新图文 → 粘贴内容 → 保存/发布
 * 
 * 需要：npm install playwright
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class WeChatAutoPublisher {
    constructor(config = {}) {
        this.headless = config.headless ?? false;  // 默认显示浏览器，方便扫码
        this.userDataDir = config.userDataDir || './data/wechat-browser';
        this.timeout = config.timeout || 60000;
        this.slowMo = config.slowMo || 100;  // 操作延迟，模拟人工
        
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    /**
     * 初始化浏览器
     */
    async init() {
        console.log('  🌐 初始化浏览器...');
        
        // 确保用户数据目录存在
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }

        // 启动浏览器（持久化登录状态）
        this.browser = await chromium.launch({
            headless: this.headless,
            slowMo: this.slowMo,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox'
            ]
        });

        // 创建持久化上下文（保存 cookies）
        this.context = await this.browser.newContext({
            storageState: path.join(this.userDataDir, 'auth.json'),
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        this.page = await this.context.newPage();
        
        console.log('  ✅ 浏览器已启动');
        return this.page;
    }

    /**
     * 登录微信公众号
     */
    async login() {
        console.log('  🔐 检查登录状态...');
        
        await this.page.goto('https://mp.weixin.qq.com', {
            waitUntil: 'networkidle',
            timeout: this.timeout
        });

        // 检查是否已登录
        const currentUrl = this.page.url();
        
        if (currentUrl.includes('cgi-bin/home')) {
            console.log('  ✅ 已登录');
            return true;
        }

        // 未登录，等待用户扫码
        console.log('  📱 请用微信扫码登录...');
        console.log('  ⏳ 等待登录中（浏览器窗口已打开）...');
        
        // 等待登录成功（URL 变化或出现特定元素）
        try {
            await this.page.waitForURL('**/cgi-bin/home**', {
                timeout: 120000  // 2分钟超时
            });
            
            // 保存登录状态
            await this.context.storageState({
                path: path.join(this.userDataDir, 'auth.json')
            });
            
            console.log('  ✅ 登录成功，状态已保存');
            return true;
        } catch (err) {
            console.log('  ❌ 登录超时');
            return false;
        }
    }

    /**
     * 创建图文消息
     */
    async createArticle(article) {
        console.log(`  📝 创建图文: ${article.title}`);
        
        // 进入素材管理
        await this.page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createTyp=5', {
            waitUntil: 'networkidle'
        });

        // 等待编辑器加载
        await this.page.waitForSelector('.edui-editor-iframeholder', { timeout: 30000 });
        
        // 输入标题
        const titleInput = await this.page.$('#js_appmsg_title');
        if (titleInput) {
            await titleInput.fill(article.title);
        }

        // 输入作者（可选）
        const authorInput = await this.page.$('#js_author');
        if (authorInput && article.author) {
            await authorInput.fill(article.author);
        }

        // 输入摘要（可选）
        const digestInput = await this.page.$('#js_digest');
        if (digestInput && article.excerpt) {
            await digestInput.fill(article.excerpt);
        }

        // 输入正文内容
        await this._fillContent(article.content);
        
        console.log('  ✅ 内容已填入');
        return true;
    }

    /**
     * 填入正文内容
     */
    async _fillContent(htmlContent) {
        // 微信编辑器在 iframe 中
        const editorFrame = await this.page.frameLocator('#ueditor_0');
        
        // 获取编辑区域
        const editorBody = editorFrame.locator('body.view_body');
        
        // 点击激活编辑器
        await editorBody.click();
        
        // 使用剪贴板 API 插入 HTML
        // 方法1：直接设置 innerHTML（简单但可能丢失格式）
        await this.page.evaluate((content) => {
            const iframe = document.getElementById('ueditor_0');
            if (iframe && iframe.contentDocument) {
                const body = iframe.contentDocument.body;
                body.innerHTML = content;
            }
        }, htmlContent);
        
        // 触发输入事件
        await this.page.evaluate(() => {
            const iframe = document.getElementById('ueditor_0');
            if (iframe && iframe.contentDocument) {
                const event = new Event('input', { bubbles: true });
                iframe.contentDocument.body.dispatchEvent(event);
            }
        });
    }

    /**
     * 保存草稿
     */
    async saveDraft() {
        console.log('  💾 保存草稿...');
        
        // 点击保存按钮
        const saveBtn = await this.page.$('#js_submit');
        if (saveBtn) {
            await saveBtn.click();
            
            // 等待保存成功提示
            await this.page.waitForTimeout(2000);
            
            console.log('  ✅ 草稿已保存');
            return true;
        }
        
        console.log('  ⚠️ 未找到保存按钮');
        return false;
    }

    /**
     * 发布文章（需要群发权限）
     * 注意：个人订阅号每天只能群发1次
     */
    async publish() {
        console.log('  📤 发布文章...');
        
        // 点击保存并群发
        const publishBtn = await this.page.$('#js_send');
        if (publishBtn) {
            await publishBtn.click();
            
            // 等待群发确认弹窗
            await this.page.waitForTimeout(1000);
            
            // 确认群发
            const confirmBtn = await this.page.$('.weui-dialog__btn_primary');
            if (confirmBtn) {
                await confirmBtn.click();
                console.log('  ✅ 文章已发布');
                return true;
            }
        }
        
        console.log('  ⚠️ 发布失败或无群发权限');
        return false;
    }

    /**
     * 执行完整的发布流程
     */
    async execute(article, options = {}) {
        const { saveOnly = false } = options;
        
        try {
            // 1. 初始化
            await this.init();
            
            // 2. 登录
            const loggedIn = await this.login();
            if (!loggedIn) {
                return { success: false, error: '登录失败' };
            }
            
            // 3. 创建文章
            await this.createArticle(article);
            
            // 4. 保存或发布
            if (saveOnly) {
                await this.saveDraft();
            } else {
                await this.saveDraft();
                // await this.publish();  // 取消注释以启用自动发布
            }
            
            // 5. 保存登录状态
            await this.context.storageState({
                path: path.join(this.userDataDir, 'auth.json')
            });
            
            return { 
                success: true, 
                message: saveOnly ? '草稿已保存' : '文章已保存',
                url: this.page.url()
            };
            
        } catch (err) {
            console.log(`  ❌ 错误: ${err.message}`);
            return { success: false, error: err.message };
        } finally {
            // 关闭浏览器（或保持打开以便下次使用）
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    /**
     * 关闭浏览器
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

/**
 * 集成到 Earning Agent 的封装函数
 */
async function publishToWeChat(article, config = {}) {
    const publisher = new WeChatAutoPublisher({
        headless: false,  // 首次运行需要显示窗口扫码
        ...config
    });

    return publisher.execute(article, {
        saveOnly: config.saveOnly ?? true  // 默认只保存草稿，避免误发
    });
}

/**
 * 检查登录状态（不启动完整流程）
 */
async function checkLoginStatus() {
    const authPath = path.join('./data/wechat-browser', 'auth.json');
    
    if (!fs.existsSync(authPath)) {
        return { loggedIn: false, message: '未找到登录状态，需要扫码登录' };
    }
    
    try {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        const cookies = auth.cookies || [];
        
        // 检查是否有有效的微信 cookie
        const hasSession = cookies.some(c => 
            c.domain.includes('weixin.qq.com') && 
            c.name.includes('wxuin') || c.name.includes('pass_ticket')
        );
        
        return {
            loggedIn: hasSession,
            message: hasSession ? '登录状态有效' : '登录状态已过期，需要重新扫码'
        };
    } catch {
        return { loggedIn: false, message: '登录状态文件损坏，需要重新扫码' };
    }
}

module.exports = {
    WeChatAutoPublisher,
    publishToWeChat,
    checkLoginStatus
};
