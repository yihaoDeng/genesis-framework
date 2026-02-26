/**
 * 配置管理
 */

module.exports = {
    // 智能体身份
    name: 'EarningAgent',
    
    // 平台配置
    platforms: {
        devto: {
            enabled: true,
            apiKeyEnv: 'DEVTO_API_KEY',
            maxTags: 4
        },
        medium: {
            enabled: false,
            apiKeyEnv: 'MEDIUM_TOKEN'
        }
    },
    
    // 热点源配置
    trendSources: {
        hackernews: {
            enabled: true,
            minScore: 100,
            maxItems: 10
        },
        reddit: {
            enabled: true,
            subreddits: ['programming', 'artificial', 'technology'],
            minScore: 50,
            maxItems: 10
        }
    },
    
    // 预算配置
    budget: {
        dailyLimitCNY: 20,        // 每日成本上限 (CNY)
        warningThreshold: 0.8,    // 警告阈值 (80%)
        criticalThreshold: 1.0    // 临界阈值 (100%)
    },
    
    // 内容配置
    content: {
        minWordCount: 800,        // 最小字数
        maxDailyPublish: 3,       // 每日最大发布数
        defaultStyle: 'tutorial', // 默认风格
        defaultTags: ['programming', 'technology', 'ai']
    },
    
    // LLM 配置
    llm: {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7
    },
    
    // 话题配置
    topics: {
        expertise: ['技术教程', '行业分析', 'AI应用', '编程技巧'],
        blacklist: ['政治', '争议话题', '敏感内容'],
        preferred: ['AI Agents', 'LLM', 'JavaScript', 'Python', 'Web Development']
    },
    
    // 运行配置
    runtime: {
        defaultInterval: 3600000,  // 默认间隔 (1小时)
        maxRetries: 3,
        retryDelay: 5000
    }
};
