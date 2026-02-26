/**
 * WeChat Publisher Skill — 微信公众号发布技能
 * 
 * 功能:
 * - Markdown 转 微信公众号富文本
 * - 代码语法高亮
 * - 生成草稿 HTML（可复制粘贴到公众号后台）
 * - 图片上传（需要配置微信 API）
 * 
 * 使用:
 * 1. 手动模式：生成 HTML → 复制到公众号后台
 * 2. API 模式：需要已认证的服务号
 */

const { WeChatFormatter } = require('../lib/wechat-formatter');
const { HttpClient } = require('../lib/http');
const fs = require('fs');
const path = require('path');

class WeChatPublisher {
    constructor(config = {}) {
        this.formatter = new WeChatFormatter(config.formatter || {});
        this.http = new HttpClient();
        
        // 微信 API 配置
        this.appId = config.appId || process.env.WECHAT_APP_ID;
        this.appSecret = config.appSecret || process.env.WECHAT_APP_SECRET;
        this.accessToken = null;
        this.tokenExpireTime = 0;
        
        // 输出目录
        this.outputDir = config.outputDir || './data/wechat-drafts';
    }

    /**
     * 格式化文章为微信公众号格式
     * @param {object} article - 文章对象
     * @returns {object} - 格式化结果
     */
    format(article) {
        console.log(`  📝 格式化文章为微信公众号格式: ${article.title}`);

        const html = this.formatter.format(article.content, {
            title: article.title,
            author: article.author || 'AI Agent'
        });

        return {
            title: article.title,
            content: html,
            excerpt: this._generateExcerpt(article.content),
            thumbMediaId: null,  // 封面图，需要先上传
            digest: article.excerpt || this._generateExcerpt(article.content),
            contentSourceUrl: article.sourceUrl || '',
            needOpenComment: 1,
            onlyFansCanComment: 0
        };
    }

    /**
     * 生成草稿文件
     * @param {object} formatted - 格式化后的文章
     * @returns {object} - 草稿信息
     */
    createDraft(formatted) {
        // 确保输出目录存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeTitle = formatted.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').slice(0, 30);
        const filename = `${timestamp}_${safeTitle}.html`;
        const filepath = path.join(this.outputDir, filename);

        // 生成完整 HTML 文件
        this.formatter.toFile(formatted.content, filepath);

        // 生成元数据
        const meta = {
            id: `draft_${timestamp}`,
            title: formatted.title,
            filename: filename,
            filepath: filepath,
            createdAt: new Date().toISOString(),
            status: 'draft',
            digest: formatted.digest
        };

        // 保存元数据
        const metaPath = filepath.replace('.html', '.json');
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

        console.log(`  ✅ 草稿已保存: ${filepath}`);

        return {
            success: true,
            draft: meta,
            html: formatted.content,
            filepath: filepath,
            // 提供可直接复制的内容
            clipboardReady: this._prepareForClipboard(formatted.content)
        };
    }

    /**
     * 准备剪贴板内容（去除 HTML 外壳）
     */
    _prepareForClipboard(html) {
        // 提取 section 内容，方便直接粘贴到公众号编辑器
        const match = html.match(/<section[^>]*>([\s\S]*)<\/section>/);
        return match ? match[1] : html;
    }

    /**
     * 生成摘要
     */
    _generateExcerpt(content, maxLength = 120) {
        // 移除 Markdown 标记
        let text = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]+`/g, '')
            .replace(/[#*_~\[\]()]/g, '')
            .replace(/\n/g, ' ')
            .trim();

        if (text.length > maxLength) {
            text = text.slice(0, maxLength) + '...';
        }

        return text;
    }

    /**
     * 获取微信 Access Token
     */
    async getAccessToken() {
        // 检查缓存的 token 是否有效
        if (this.accessToken && Date.now() < this.tokenExpireTime) {
            return this.accessToken;
        }

        if (!this.appId || !this.appSecret) {
            throw new Error('微信 API 未配置，请设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET');
        }

        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
        
        const { data, success, error } = await this.http.get(url);
        
        if (!success || data.errcode) {
            throw new Error(`获取 Access Token 失败: ${data.errmsg || error}`);
        }

        this.accessToken = data.access_token;
        this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期

        return this.accessToken;
    }

    /**
     * 上传图片到微信服务器
     * @param {string} imagePath - 图片路径或 URL
     * @param {boolean} isPermanent - 是否永久素材
     * @returns {object} - 上传结果
     */
    async uploadImage(imagePath, isPermanent = true) {
        try {
            const token = await this.getAccessToken();
            
            // 如果是 URL，先下载
            let imageData;
            if (imagePath.startsWith('http')) {
                const response = await fetch(imagePath);
                imageData = await response.buffer();
            } else {
                imageData = fs.readFileSync(imagePath);
            }

            // 上传到微信
            const endpoint = isPermanent ? 'material' : 'media';
            const url = `https://api.weixin.qq.com/cgi-bin/${endpoint}/add?access_token=${token}&type=image`;

            // 注意：这里需要使用 multipart/form-data
            // 简化实现：返回待处理的标记
            console.log(`  ⚠️ 图片上传需要 multipart/form-data 支持，暂跳过: ${imagePath}`);
            
            return {
                success: false,
                error: '图片上传需要额外的 form-data 依赖',
                mediaId: null
            };
        } catch (err) {
            return {
                success: false,
                error: err.message,
                mediaId: null
            };
        }
    }

    /**
     * 创建草稿（通过 API）
     * 需要已认证的服务号
     */
    async createDraftViaAPI(articles) {
        try {
            const token = await this.getAccessToken();
            const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

            // articles 可以是单篇或数组
            const articlesList = Array.isArray(articles) ? articles : [articles];

            const body = {
                articles: articlesList.map(a => ({
                    title: a.title,
                    content: a.content,
                    thumb_media_id: a.thumbMediaId || '',
                    digest: a.digest || '',
                    content_source_url: a.contentSourceUrl || '',
                    author: a.author || '',
                    need_open_comment: a.needOpenComment || 0,
                    only_fans_can_comment: a.onlyFansCanComment || 0
                }))
            };

            const { data, success, error } = await this.http.post(url, body);

            if (!success || data.errcode) {
                throw new Error(`创建草稿失败: ${data.errmsg || error}`);
            }

            return {
                success: true,
                mediaId: data.media_id
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * 发布草稿
     */
    async publishDraft(mediaId) {
        try {
            const token = await this.getAccessToken();
            const url = `https://api.weixin.qq.com/cgi-bin/message/mass/sendall?access_token=${token}`;

            const body = {
                filter: {
                    is_to_all: true
                },
                mpnews: {
                    media_id: mediaId
                },
                msgtype: 'mpnews',
                send_ignore_reprint: 0
            };

            const { data, success, error } = await this.http.post(url, body);

            if (!success || data.errcode) {
                throw new Error(`发布失败: ${data.errmsg || error}`);
            }

            return {
                success: true,
                msgId: data.msg_id,
                msgDataId: data.msg_data_id
            };
        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * 执行发布（Skill 入口）
     */
    async execute(ctx, article) {
        console.log(`\n  📱 微信公众号发布流程`);

        // 1. 格式化
        const formatted = this.format(article);

        // 2. 生成草稿文件
        const draft = this.createDraft(formatted);

        // 3. 如果配置了 API，尝试通过 API 发布
        let apiResult = null;
        if (this.appId && this.appSecret) {
            console.log(`  🔗 尝试通过 API 创建草稿...`);
            apiResult = await this.createDraftViaAPI(formatted);
            
            if (apiResult.success) {
                console.log(`  ✅ API 草稿创建成功: ${apiResult.mediaId}`);
            } else {
                console.log(`  ⚠️ API 草稿创建失败: ${apiResult.error}`);
            }
        }

        return {
            success: true,
            platform: 'wechat',
            method: apiResult?.success ? 'api' : 'manual',
            draft: draft.draft,
            html: draft.html,
            clipboardReady: draft.clipboardReady,
            filepath: draft.filepath,
            apiResult: apiResult
        };
    }
}

/**
 * 快速格式化（不依赖 Agent Context）
 */
function quickFormat(markdown, title = '未命名文章') {
    const formatter = new WeChatFormatter();
    return formatter.format(markdown, { title });
}

/**
 * 批量处理图片（将网络图片转为微信可用格式）
 */
async function processImages(html, imageHandler) {
    // 查找所有待处理图片
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*data-wechat-pending="true"[^>]*>/g;
    const matches = [...html.matchAll(imgRegex)];

    for (const match of matches) {
        const originalUrl = match[1];
        const result = await imageHandler(originalUrl);
        
        if (result.success) {
            html = html.replace(match[0], match[0].replace(originalUrl, result.url));
        }
    }

    return html;
}

module.exports = {
    name: 'wechat-publisher',
    description: '发布文章到微信公众号',
    priority: 3,

    execute: async (ctx) => {
        const article = ctx.currentArticle;
        if (!article) {
            throw new Error('No article set. Set ctx.currentArticle before calling wechat-publisher.');
        }

        const publisher = new WeChatPublisher({
            appId: process.env.WECHAT_APP_ID,
            appSecret: process.env.WECHAT_APP_SECRET,
            outputDir: './data/wechat-drafts'
        });

        return publisher.execute(ctx, article);
    },

    WeChatPublisher,
    WeChatFormatter,
    quickFormat,
    processImages
};
