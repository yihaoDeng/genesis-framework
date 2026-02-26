/**
 * WeChat Formatter — 微信公众号格式转换器
 * 
 * 将 Markdown 转换为微信公众号可用的富文本 HTML
 * 特点：
 * - 内联 CSS 样式
 * - 代码块语法高亮
 * - 支持引用、列表、表格
 * - 生成可直接粘贴的 HTML
 */

class WeChatFormatter {
    constructor(config = {}) {
        this.theme = config.theme || 'default';
        this.codeTheme = config.codeTheme || 'github';
        this.fontSize = config.fontSize || 16;
        this.lineHeight = config.lineHeight || 1.75;
        
        // 主题样式
        this.styles = this._getStyles();
    }

    /**
     * 转换 Markdown 到微信公众号 HTML
     * @param {string} markdown - Markdown 内容
     * @param {object} meta - 文章元信息
     * @returns {string} 微信公众号 HTML
     */
    format(markdown, meta = {}) {
        let html = markdown;

        // 1. 预处理
        html = this._preprocess(html);

        // 2. 转换各元素
        html = this._convertCodeBlocks(html);
        html = this._convertHeadings(html);
        html = this._convertBlockquotes(html);
        html = this._convertLists(html);
        html = this._convertTables(html);
        html = this._convertInlineStyles(html);
        html = this._convertImages(html);
        html = this._convertLinks(html);

        // 3. 包装内容
        html = this._wrapContent(html, meta);

        // 4. 后处理
        html = this._postprocess(html);

        return html;
    }

    /**
     * 预处理
     */
    _preprocess(html) {
        // 移除 YAML front matter
        html = html.replace(/^---[\s\S]*?---\n?/, '');
        
        // 统一换行符
        html = html.replace(/\r\n/g, '\n');
        
        return html;
    }

    /**
     * 转换代码块
     */
    _convertCodeBlocks(html) {
        // 转换围栏代码块 ```code```
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const highlighted = this._highlightCode(code.trim(), lang);
            const langLabel = lang ? this._createLangLabel(lang) : '';
            
            return `<section style="${this.styles.codeSection}">
${langLabel}
<pre style="${this.styles.codePre}"><code style="${this.styles.code}">${highlighted}</code></pre>
</section>`;
        });

        // 转换行内代码 `code`
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            return `<code style="${this.styles.inlineCode}">${this._escapeHtml(code)}</code>`;
        });

        return html;
    }

    /**
     * 代码语法高亮（简化版）
     */
    _highlightCode(code, lang) {
        let escaped = this._escapeHtml(code);

        // 通用高亮规则
        const rules = [
            // 关键字
            { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|extends|static|get|set|typeof|instanceof)\b/g, class: 'keyword' },
            // 字符串
            { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, class: 'string' },
            // 数字
            { pattern: /\b(\d+\.?\d*)\b/g, class: 'number' },
            // 注释
            { pattern: /(\/\/.*$|#.*$)/gm, class: 'comment' },
            // 函数名
            { pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, class: 'function' },
        ];

        // 语言特定规则
        if (['javascript', 'js', 'typescript', 'ts'].includes(lang)) {
            rules.push(
                { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, class: 'literal' },
                { pattern: /\b(console|document|window|Math|JSON|Array|Object|String|Number|Boolean|Promise|Map|Set)\b/g, class: 'builtin' }
            );
        } else if (['python', 'py'].includes(lang)) {
            rules.push(
                { pattern: /\b(True|False|None|self)\b/g, class: 'literal' },
                { pattern: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|pass|break|continue|raise|in|not|and|or|is)\b/g, class: 'keyword' }
            );
        }

        // 应用高亮（从后往前，避免位置偏移）
        const tokens = [];
        for (const rule of rules) {
            escaped = escaped.replace(rule.pattern, (match) => {
                const placeholder = `__TOKEN_${tokens.length}__`;
                tokens.push(this._wrapToken(match, rule.class));
                return placeholder;
            });
        }

        // 还原 tokens
        tokens.forEach((token, i) => {
            escaped = escaped.replace(`__TOKEN_${i}__`, token);
        });

        return escaped;
    }

    /**
     * 包装高亮 token
     */
    _wrapToken(text, className) {
        const colors = {
            keyword: '#d73a49',
            string: '#032f62',
            number: '#005cc5',
            comment: '#6a737d',
            function: '#6f42c1',
            literal: '#005cc5',
            builtin: '#005cc5'
        };
        const color = colors[className] || '#24292e';
        return `<span style="color: ${color}">${text}</span>`;
    }

    /**
     * 创建语言标签
     */
    _createLangLabel(lang) {
        const langMap = {
            'javascript': 'JavaScript',
            'js': 'JavaScript',
            'typescript': 'TypeScript',
            'ts': 'TypeScript',
            'python': 'Python',
            'py': 'Python',
            'java': 'Java',
            'go': 'Go',
            'rust': 'Rust',
            'bash': 'Shell',
            'shell': 'Shell',
            'json': 'JSON',
            'yaml': 'YAML',
            'html': 'HTML',
            'css': 'CSS',
            'sql': 'SQL'
        };
        const label = langMap[lang] || lang.toUpperCase();
        return `<div style="${this.styles.codeLang}">${label}</div>`;
    }

    /**
     * 转换标题
     */
    _convertHeadings(html) {
        // H1 - 文章标题（通常不用于正文）
        html = html.replace(/^# (.+)$/gm, (match, text) => {
            return `<h1 style="${this.styles.h1}">${text}</h1>`;
        });

        // H2 - 主要章节
        html = html.replace(/^## (.+)$/gm, (match, text) => {
            return `<h2 style="${this.styles.h2}">${text}</h2>`;
        });

        // H3 - 子章节
        html = html.replace(/^### (.+)$/gm, (match, text) => {
            return `<h3 style="${this.styles.h3}">${text}</h3>`;
        });

        // H4 - 小节
        html = html.replace(/^#### (.+)$/gm, (match, text) => {
            return `<h4 style="${this.styles.h4}">${text}</h4>`;
        });

        return html;
    }

    /**
     * 转换引用块
     */
    _convertBlockquotes(html) {
        html = html.replace(/^(?:> )(.+)$/gm, (match, text) => {
            return `<blockquote style="${this.styles.blockquote}">${text}</blockquote>`;
        });

        // 多行引用合并
        html = html.replace(/(<blockquote[^>]*>.*?<\/blockquote>\n?)+/g, (match) => {
            const lines = match.match(/(?<=<blockquote[^>]*>).+?(?=<\/blockquote>)/g) || [];
            if (lines.length > 1) {
                return `<blockquote style="${this.styles.blockquote}">${lines.join('<br>')}</blockquote>`;
            }
            return match;
        });

        return html;
    }

    /**
     * 转换列表
     */
    _convertLists(html) {
        // 无序列表
        html = html.replace(/^[*-] (.+)$/gm, (match, text) => {
            return `<li style="${this.styles.li}">${text}</li>`;
        });

        // 有序列表
        html = html.replace(/^\d+\. (.+)$/gm, (match, text) => {
            return `<li style="${this.styles.li}">${text}</li>`;
        });

        // 包装连续的列表项
        html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
            return `<ul style="${this.styles.ul}">${match}</ul>`;
        });

        return html;
    }

    /**
     * 转换表格
     */
    _convertTables(html) {
        // 简化的表格转换
        const tableRegex = /^\|(.+)\|\n\|[-:\| ]+\|\n((?:\|.+\|\n?)+)/gm;
        
        html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
            const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
            const rows = bodyRows.trim().split('\n').map(row => 
                row.split('|').map(cell => cell.trim()).filter(Boolean)
            );

            let table = `<table style="${this.styles.table}">`;
            
            // 表头
            table += '<tr>';
            headers.forEach(h => {
                table += `<th style="${this.styles.th}">${h}</th>`;
            });
            table += '</tr>';

            // 表体
            rows.forEach(row => {
                table += '<tr>';
                row.forEach(cell => {
                    table += `<td style="${this.styles.td}">${cell}</td>`;
                });
                table += '</tr>';
            });

            table += '</table>';
            return table;
        });

        return html;
    }

    /**
     * 转换行内样式
     */
    _convertInlineStyles(html) {
        // 粗体 **text** 或 __text__
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // 斜体 *text* 或 _text_
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

        // 删除线 ~~text~~
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // 水平线
        html = html.replace(/^---$/gm, `<hr style="${this.styles.hr}">`);

        // 段落（连续非空行）
        html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, (match) => {
            return `<p style="${this.styles.p}">${match}</p>`;
        });

        return html;
    }

    /**
     * 转换图片
     */
    _convertImages(html) {
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            // 微信公众号图片需要上传后替换 URL
            // 这里先生成占位符，后续处理
            return `<img src="${url}" alt="${alt}" style="${this.styles.img}" data-wechat-pending="true">`;
        });

        return html;
    }

    /**
     * 转换链接
     */
    _convertLinks(html) {
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            // 微信公众号中链接显示为蓝色文字，但只有发布后可点击
            return `<a href="${url}" style="${this.styles.a}">${text}</a>`;
        });

        return html;
    }

    /**
     * 包装内容
     */
    _wrapContent(html, meta) {
        // 添加开头（可选）
        const intro = meta.title ? 
            `<h1 style="${this.styles.h1}">${meta.title}</h1>` : '';

        // 添加作者信息（可选）
        const author = meta.author ?
            `<p style="${this.styles.author}">作者：${meta.author}</p>` : '';

        // 添加底部信息
        const footer = `
<section style="${this.styles.footer}">
<p>本文由 AI Agent 自动生成</p>
<p>更多内容请关注公众号</p>
</section>`;

        return `
<section style="${this.styles.wrapper}">
${intro}
${author}
${html}
${footer}
</section>`;
    }

    /**
     * 后处理
     */
    _postprocess(html) {
        // 移除多余空行
        html = html.replace(/\n{3,}/g, '\n\n');
        
        // 修复嵌套问题
        html = html.replace(/<p[^>]*>(<[^>]+>)/g, '$1');
        html = html.replace(/(<\/[^>]+>)<\/p>/g, '$1');

        return html;
    }

    /**
     * HTML 转义
     */
    _escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 获取样式配置
     */
    _getStyles() {
        return {
            // 容器
            wrapper: `max-width: 100%; margin: 0 auto; padding: 20px 15px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: ${this.fontSize}px; line-height: ${this.lineHeight}; color: #333;`,

            // 标题
            h1: `margin: 25px 0 15px; padding-bottom: 10px; font-size: 24px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;`,
            h2: `margin: 25px 0 15px; padding: 10px 0; font-size: 20px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;`,
            h3: `margin: 20px 0 10px; font-size: 18px; font-weight: bold; color: #333;`,
            h4: `margin: 18px 0 8px; font-size: 16px; font-weight: bold; color: #333;`,

            // 段落
            p: `margin: 15px 0; text-align: justify; word-break: break-word;`,
            author: `margin: 10px 0 20px; font-size: 14px; color: #888;`,

            // 代码块
            codeSection: `margin: 20px 0; border-radius: 6px; overflow: hidden; background: #f6f8fa;`,
            codeLang: `padding: 8px 15px; font-size: 12px; color: #666; background: #f0f0f0; border-bottom: 1px solid #e1e4e8;`,
            codePre: `margin: 0; padding: 15px; overflow-x: auto; background: #f6f8fa;`,
            code: `font-family: "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; font-size: 14px; line-height: 1.6; color: #24292e; white-space: pre;`,
            inlineCode: `padding: 2px 6px; font-family: "SF Mono", Consolas, monospace; font-size: 14px; background: #f0f0f0; border-radius: 4px; color: #d73a49;`,

            // 引用
            blockquote: `margin: 15px 0; padding: 15px 20px; background: #f8f8f8; border-left: 4px solid #42b983; color: #666; font-size: 15px;`,

            // 列表
            ul: `margin: 15px 0; padding-left: 25px; list-style-type: disc;`,
            li: `margin: 8px 0; line-height: 1.8;`,

            // 表格
            table: `width: 100%; margin: 15px 0; border-collapse: collapse; font-size: 14px;`,
            th: `padding: 10px 12px; background: #f6f8fa; border: 1px solid #dfe2e5; text-align: left; font-weight: bold;`,
            td: `padding: 10px 12px; border: 1px solid #dfe2e5;`,

            // 链接
            a: `color: #42b983; text-decoration: none; border-bottom: 1px solid #42b983;`,

            // 图片
            img: `max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 4px;`,

            // 分隔线
            hr: `margin: 25px 0; border: none; height: 1px; background: #eee;`,

            // 底部
            footer: `margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #888; text-align: center;`
        };
    }

    /**
     * 导出为文件
     */
    toFile(html, filename = 'article.html') {
        const fs = require('fs');
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>微信公众号文章</title>
</head>
<body>
${html}
</body>
</html>`;
        fs.writeFileSync(filename, fullHtml, 'utf-8');
        return filename;
    }
}

module.exports = { WeChatFormatter };
