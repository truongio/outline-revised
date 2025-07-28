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
    
    async fetchArticle(url) {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch the page');
        }
        
        const data = await response.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        return this.parseArticle(doc, url);
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
        article.content = this.extractContent(doc);
        
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
    
    extractContent(doc) {
        const contentSelectors = [
            'article',
            '[class*="article-content"]',
            '[class*="post-content"]',
            '[class*="entry-content"]',
            '[class*="content-body"]',
            'main',
            '.content'
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
        
        const paragraphs = clone.querySelectorAll('p');
        const validParagraphs = Array.from(paragraphs).filter(p => {
            const text = p.textContent.trim();
            return text.length > 50 && !this.isUnwantedContent(text);
        });
        
        if (validParagraphs.length > 0) {
            const contentDiv = document.createElement('div');
            validParagraphs.forEach(p => {
                contentDiv.appendChild(p.cloneNode(true));
            });
            return contentDiv.innerHTML;
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