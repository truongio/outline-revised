class ArticleReader {
    constructor() {
        this.urlInput = document.getElementById('urlInput');
        this.extractBtn = document.getElementById('extractBtn');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.articleContent = document.getElementById('articleContent');
        this.articleTitle = document.getElementById('articleTitle');
        this.articleAuthor = document.getElementById('articleAuthor');
        this.articleDate = document.getElementById('articleDate');
        this.articleBody = document.getElementById('articleBody');
        
        this.initEventListeners();
        this.checkUrlFromPath();
    }
    
    initEventListeners() {
        this.extractBtn.addEventListener('click', () => this.extractArticle());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.extractArticle();
            }
        });
        
        this.urlInput.addEventListener('paste', (e) => {
            setTimeout(() => this.extractArticle(), 100);
        });
    }
    
    async extractArticle() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }
        
        if (!this.isValidUrl(url)) {
            this.showError('Please enter a valid URL');
            return;
        }
        
        const currentParams = new URLSearchParams(window.location.search);
        const currentUrl = currentParams.get('url');
        
        if (currentUrl !== url) {
            const newParams = new URLSearchParams();
            newParams.set('url', url);
            window.history.pushState({}, '', '?' + newParams.toString());
        }
        
        this.showLoading();
        
        try {
            const article = await this.fetchArticle(url);
            this.displayArticle(article);
        } catch (error) {
            this.showError(`Failed to extract article: ${error.message}`);
        }
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    async fetchArticle(url, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/html');
                
                return this.parseArticle(doc, url);
            } catch (error) {
                if (attempt === retries) {
                    throw new Error(`Failed to fetch article after ${retries} attempts: ${error.message}`);
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
        }
    }
    
    parseArticle(doc, url) {
        const article = {
            title: '',
            author: '',
            date: '',
            content: ''
        };
        
        article.title = this.extractTitle(doc);
        article.author = this.extractAuthor(doc);
        article.date = this.extractDate(doc);
        article.content = this.extractContent(doc, url);
        
        return article;
    }
    
    extractTitle(doc) {
        const selectors = [
            'h1[class*="title"]',
            'h1[class*="headline"]',
            '[class*="article-title"] h1',
            '[class*="post-title"] h1',
            'h1.entry-title',
            'h1',
            'title'
        ];
        
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        return 'Untitled Article';
    }
    
    extractAuthor(doc) {
        const selectors = [
            '[class*="author"] [class*="name"]',
            '[class*="byline"]',
            '[rel="author"]',
            '[class*="writer"]',
            'meta[name="author"]'
        ];
        
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent || element.getAttribute('content') || '';
                if (text.trim()) {
                    return text.trim();
                }
            }
        }
        
        return '';
    }
    
    extractDate(doc) {
        const selectors = [
            'time[datetime]',
            '[class*="date"]',
            '[class*="publish"]',
            'meta[property="article:published_time"]',
            'meta[name="date"]'
        ];
        
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const dateStr = element.getAttribute('datetime') || 
                              element.getAttribute('content') || 
                              element.textContent || '';
                
                if (dateStr.trim()) {
                    try {
                        const date = new Date(dateStr.trim());
                        if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        
        return '';
    }
    
    extractContent(doc, url = '') {
        // Special handling for Paul Graham's site
        if (url.includes('paulgraham.com')) {
            return this.extractPaulGrahamContent(doc);
        }
        
        const contentSelectors = [
            'article',
            '[class*="article-content"]',
            '[class*="post-content"]',
            '[class*="entry-content"]',
            '[class*="content-body"]',
            'main',
            '.content',
            'table',  // Paul Graham uses tables for layout
            'td',     // Content often in table cells
            'body'    // Ultimate fallback
        ];
        
        for (const selector of contentSelectors) {
            const container = doc.querySelector(selector);
            if (container) {
                return this.cleanContent(container);
            }
        }
        
        const fallbackContent = doc.querySelector('body');
        return fallbackContent ? this.cleanContent(fallbackContent) : '';
    }
    
    extractPaulGrahamContent(doc) {
        // Paul Graham's site uses a specific table layout
        // The main content is in a table cell, usually the rightmost one with width="435"
        const mainTable = doc.querySelector('table[border="0"][cellspacing="0"][cellpadding="0"]');
        
        if (mainTable) {
            // Look for the content cell - usually has width="435"
            const contentCell = mainTable.querySelector('td[width="435"]') || 
                               mainTable.querySelector('td:last-child');
            
            if (contentCell) {
                return this.cleanPaulGrahamContent(contentCell);
            }
        }
        
        // Fallback: look for the main content area by finding the largest td
        const allCells = doc.querySelectorAll('td');
        let largestCell = null;
        let maxTextLength = 0;
        
        allCells.forEach(cell => {
            const textLength = cell.textContent.length;
            if (textLength > maxTextLength) {
                maxTextLength = textLength;
                largestCell = cell;
            }
        });
        
        if (largestCell && maxTextLength > 1000) {
            return this.cleanPaulGrahamContent(largestCell);
        }
        
        // Final fallback
        return this.cleanContent(doc.body);
    }
    
    cleanPaulGrahamContent(container) {
        const clone = container.cloneNode(true);
        
        // Remove unwanted elements specific to Paul Graham's site
        const unwantedSelectors = [
            'script',
            'style',
            'map',        // Image maps for navigation
            'img[usemap]', // Navigation images
            'area',       // Image map areas
            'hr',         // Horizontal rules at bottom
            'table[border="0"] img', // Navigation images in tables
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Remove "Thanks" section at the end (usually after the last <br><br>)
        const html = clone.innerHTML;
        const thanksIndex = html.toLowerCase().indexOf('<b>thanks</b>');
        if (thanksIndex !== -1) {
            clone.innerHTML = html.substring(0, thanksIndex);
        }
        
        // Handle Paul Graham's <br><br> separated content
        if (clone.innerHTML.includes('<br><br>')) {
            const htmlContent = clone.innerHTML;
            const paragraphs = htmlContent.split(/<br\s*\/?>\s*<br\s*\/?>/i)
                .map(p => p.replace(/<br\s*\/?>/gi, ' ').trim())
                .filter(p => {
                    const text = p.replace(/<[^>]*>/g, '').trim();
                    return text.length > 20 && 
                           !this.isUnwantedContent(text) &&
                           !text.match(/^(home|essays|h&p|books|yc|arc|bel|lisp|spam|faqs|raqs|quotes|rss|bio|twitter|mastodon)$/i);
                });
            
            if (paragraphs.length > 0) {
                const contentDiv = document.createElement('div');
                paragraphs.forEach(paragraphHtml => {
                    const p = document.createElement('p');
                    p.innerHTML = paragraphHtml;
                    contentDiv.appendChild(p);
                });
                return contentDiv.innerHTML;
            }
        }
        
        // Fallback to regular cleaning
        return this.cleanContent(clone);
    }
    
    
    cleanContent(container) {
        const clone = container.cloneNode(true);
        
        const unwantedSelectors = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            '.advertisement',
            '.ads',
            '.social',
            '.share',
            '.comments',
            '.sidebar',
            '.related',
            '.newsletter',
            '.popup',
            '.modal'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Remove anchor links and icons more comprehensively
        const anchorLinks = clone.querySelectorAll('a[href^="#"], a[class*="anchor"], a[class*="permalink"], a[class*="link"]');
        anchorLinks.forEach(el => {
            // Remove if it's just an icon (empty text or contains SVG/icon)
            if (el.textContent.trim() === '' || el.querySelector('svg') || el.querySelector('[class*="icon"]') || 
                el.innerHTML.includes('🔗') || el.innerHTML.includes('#')) {
                el.remove();
            }
        });
        
        // Also remove any remaining SVGs and icons that might be standalone
        const icons = clone.querySelectorAll('svg, [class*="icon"]:empty, .anchor-icon');
        icons.forEach(el => {
            if (el.textContent.trim() === '') {
                el.remove();
            }
        });
        
        // Clean up leftover minimal text nodes (dots, spaces, etc.)
        const textNodes = clone.querySelectorAll('*');
        textNodes.forEach(el => {
            const text = el.textContent.trim();
            // Remove elements that only contain minimal punctuation or whitespace
            if (text.length <= 2 && /^[•·◦‣⁃▪▫\s\.]*$/.test(text) && !el.querySelector('*')) {
                el.remove();
            }
        });
        
        const contentElements = clone.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, blockquote');
        const validElements = Array.from(contentElements).filter(el => {
            const text = el.textContent.trim();
            const tagName = el.tagName.toLowerCase();
            
            // Always include headings
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                return text.length > 0 && !this.isUnwantedContent(text);
            }
            
            // Include lists if they have content
            if (['ul', 'ol'].includes(tagName)) {
                return el.children.length > 0;
            }
            
            // For paragraphs and blockquotes, use more lenient length filter for simple sites
            return text.length > 20 && !this.isUnwantedContent(text);
        });
        
        if (validElements.length > 0) {
            const contentDiv = document.createElement('div');
            
            // Filter out elements that are contained within other selected elements
            const uniqueElements = validElements.filter(el => {
                return !validElements.some(otherEl => 
                    otherEl !== el && otherEl.contains(el)
                );
            });
            
            uniqueElements.forEach(el => {
                contentDiv.appendChild(el.cloneNode(true));
            });
            return contentDiv.innerHTML;
        }
        
        // If no structured elements found, try to extract and convert to paragraphs
        // Handle <br><br> separated content (like Paul Graham's site)
        if (clone.innerHTML.includes('<br><br>')) {
            const htmlContent = clone.innerHTML;
            const paragraphs = htmlContent.split(/<br\s*\/?>\s*<br\s*\/?>/i)
                .map(p => p.replace(/<br\s*\/?>/gi, ' ').trim())
                .filter(p => {
                    const text = p.replace(/<[^>]*>/g, '').trim();
                    return text.length > 20 && !this.isUnwantedContent(text);
                });
            
            if (paragraphs.length > 0) {
                const contentDiv = document.createElement('div');
                paragraphs.forEach(paragraphHtml => {
                    const p = document.createElement('p');
                    p.innerHTML = paragraphHtml;
                    contentDiv.appendChild(p);
                });
                return contentDiv.innerHTML;
            }
        }
        
        // Fallback: try plain text splitting
        const text = clone.textContent.trim();
        if (text.length > 100) {
            const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
            if (paragraphs.length > 0) {
                const contentDiv = document.createElement('div');
                paragraphs.forEach(paragraphText => {
                    const p = document.createElement('p');
                    p.textContent = paragraphText.trim();
                    contentDiv.appendChild(p);
                });
                return contentDiv.innerHTML;
            }
        }
        
        return clone.innerHTML;
    }
    
    isUnwantedContent(text) {
        const unwantedPatterns = [
            /subscribe/i,
            /newsletter/i,
            /advertisement/i,
            /cookie/i,
            /privacy policy/i,
            /terms of service/i,
            /follow us/i,
            /share this/i
        ];
        
        return unwantedPatterns.some(pattern => pattern.test(text));
    }
    
    displayArticle(article) {
        this.hideAll();
        
        this.articleTitle.textContent = article.title;
        this.articleAuthor.textContent = article.author;
        this.articleDate.textContent = article.date;
        this.articleBody.innerHTML = article.content;
        
        this.articleContent.classList.remove('hidden');
    }
    
    showLoading() {
        this.hideAll();
        this.loading.classList.remove('hidden');
        this.extractBtn.disabled = true;
    }
    
    showError(message) {
        this.hideAll();
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        this.extractBtn.disabled = false;
    }
    
    hideAll() {
        this.loading.classList.add('hidden');
        this.error.classList.add('hidden');
        this.articleContent.classList.add('hidden');
        this.extractBtn.disabled = false;
    }
    
    checkUrlFromPath() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlFromParam = urlParams.get('url');
        
        if (urlFromParam && this.isValidUrl(urlFromParam)) {
            this.urlInput.value = urlFromParam;
            this.extractArticle();
            return;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ArticleReader();
});