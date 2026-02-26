/**
 * Publisher Skill — 平台发布技能
 * 
 * 支持多平台发布:
 * - Dev.to (已实现)
 * - Medium (预留)
 * - 微信公众号 (预留)
 */

const { HttpClient } = require('../lib/http');

class Publisher {
    constructor(config = {}) {
        this.http = new HttpClient();
        this.platforms = config.platforms || ['devto'];
        
        // API Keys
        this.devtoKey = config.devtoKey || process.env.DEVTO_API_KEY;
        this.mediumToken = config.mediumToken || process.env.MEDIUM_TOKEN;
    }

    /**
     * 执行发布
     * @param {object} ctx - Agent context
     * @param {object} article - 文章内容
     * @returns {Promise<object>} 发布结果
     */
    async execute(ctx, article) {
        console.log(`  📤 开始发布: ${article.title}`);

        const results = {};

        for (const platform of this.platforms) {
            try {
                switch (platform) {
                    case 'devto':
                        results.devto = await this.publishToDevto(article);
                        break;
                    case 'medium':
                        results.medium = await this.publishToMedium(article);
                        break;
                    default:
                        console.log(`  ⚠️ 未知平台: ${platform}`);
                }
            } catch (err) {
                console.log(`  ❌ ${platform} 发布失败: ${err.message}`);
                results[platform] = { success: false, error: err.message };
            }
        }

        // 记录发布
        const successful = Object.entries(results).filter(([_, r]) => r.success);
        if (successful.length > 0) {
            ctx.soul.data.content = ctx.soul.data.content || {};
            ctx.soul.data.content.published = ctx.soul.data.content.published || [];
            
            ctx.soul.data.content.published.push({
                id: `art_${Date.now()}`,
                title: article.title,
                publishedAt: new Date().toISOString(),
                platforms: successful.map(([p, r]) => ({
                    name: p,
                    url: r.url,
                    id: r.id
                }))
            });

            ctx.soul.remember(`发布文章到 ${successful.length} 个平台: ${article.title}`);
        }

        console.log(`  ✅ 发布完成: ${successful.length}/${this.platforms.length} 个平台`);
        return results;
    }

    /**
     * 发布到 Dev.to
     */
    async publishToDevto(article) {
        if (!this.devtoKey) {
            throw new Error('DEVTO_API_KEY not configured');
        }

        // 将 Markdown 转换为 Dev.to 格式
        const bodyMarkdown = this.formatForDevto(article);

        const { data, success, error } = await this.http.post(
            'https://dev.to/api/articles',
            {
                article: {
                    title: article.title,
                    body_markdown: bodyMarkdown,
                    published: true,
                    tags: (article.tags || []).slice(0, 4),  // Dev.to 最多4个标签
                    description: article.excerpt?.slice(0, 160) || article.title
                }
            },
            {
                headers: {
                    'api-key': this.devtoKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!success) {
            throw new Error(error);
        }

        return {
            success: true,
            url: data.url,
            id: data.id,
            platform: 'devto'
        };
    }

    /**
     * 格式化为 Dev.to 格式
     */
    formatForDevto(article) {
        const frontMatter = `---
title: ${article.title}
published: true
tags: ${(article.tags || []).join(', ')}
description: ${article.excerpt?.slice(0, 160) || ''}
---

`;
        return frontMatter + article.content;
    }

    /**
     * 发布到 Medium (预留)
     */
    async publishToMedium(article) {
        if (!this.mediumToken) {
            throw new Error('MEDIUM_TOKEN not configured');
        }

        // 1. 获取用户 ID
        const { data: user } = await this.http.get('https://api.medium.com/v1/me', {
            headers: { 'Authorization': `Bearer ${this.mediumToken}` }
        });

        // 2. 发布文章
        const { data, success, error } = await this.http.post(
            `https://api.medium.com/v1/users/${user.data.id}/posts`,
            {
                title: article.title,
                contentFormat: 'markdown',
                content: article.content,
                tags: article.tags,
                publishStatus: 'public'
            },
            {
                headers: { 'Authorization': `Bearer ${this.mediumToken}` }
            }
        );

        if (!success) {
            throw new Error(error);
        }

        return {
            success: true,
            url: data.data.url,
            id: data.data.id,
            platform: 'medium'
        };
    }
}

/**
 * 检查文章数据并更新
 */
async function fetchArticleStats(ctx, articleId) {
    const publisher = new Publisher();
    const stats = {};

    // Dev.to 文章统计
    if (publisher.devtoKey) {
        try {
            const { data } = await publisher.http.get(
                `https://dev.to/api/articles/${articleId}`,
                { headers: { 'api-key': publisher.devtoKey } }
            );

            stats.devto = {
                views: data.page_views_count,
                reactions: data.public_reactions_count,
                comments: data.comments_count
            };
        } catch (err) {
            console.log(`  ⚠️ 获取统计失败: ${err.message}`);
        }
    }

    return stats;
}

module.exports = {
    name: 'publisher',
    description: '发布文章到多个平台',
    priority: 3,

    execute: async (ctx) => {
        const article = ctx.currentArticle;
        if (!article) {
            throw new Error('No article set. Set ctx.currentArticle before calling publisher.');
        }

        const publisher = new Publisher({
            platforms: ctx.config?.platforms || ['devto'],
            devtoKey: process.env.DEVTO_API_KEY,
            mediumToken: process.env.MEDIUM_TOKEN
        });

        return publisher.execute(ctx, article);
    },

    Publisher,
    fetchArticleStats
};
