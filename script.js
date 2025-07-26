class AskMeFr {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.heroSection = document.getElementById('heroSection');
        this.mainContent = document.getElementById('mainContent');
        this.answerContent = document.getElementById('answerContent');
        this.sourcesList = document.getElementById('sourcesList');
        this.followUpQuestions = document.getElementById('followUpQuestions');
        this.backBtn = document.getElementById('backBtn');

        // API configuration
        this.apiUrl = 'http://localhost:3001/api';

        // Current mode and workspace state
        this.currentMode = 'home';
        this.workspaces = this.loadWorkspaces();
        this.currentWorkspace = null;

        this.initEventListeners();
        this.addInputAnimations();
        this.initModeSystem();
    }

    initEventListeners() {
        // Search button click
        this.searchBtn.addEventListener('click', () => this.handleSearch());

        // Enter key press
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Back button
        this.backBtn.addEventListener('click', () => this.showHeroSection());

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.searchInput.value = chip.textContent;
                this.handleSearch();
            });
        });

        // Specialized section cards
        document.querySelectorAll('.section-card').forEach(card => {
            card.addEventListener('click', () => {
                const section = card.dataset.section;
                this.handleSectionClick(section);
            });
        });
    }

    addInputAnimations() {
        // Add focus animations to search input
        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.style.transform = 'scale(1.02)';
        });

        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.style.transform = 'scale(1)';
        });

        // Update button state based on input
        this.searchInput.addEventListener('input', () => {
            const hasValue = this.searchInput.value.trim().length > 0;
            this.searchBtn.style.opacity = hasValue ? '1' : '0.7';
        });
    }

    async handleSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        // Disable search button during request
        this.searchBtn.disabled = true;
        this.searchBtn.textContent = 'Searching...';

        // Hide hero section and show results with animation
        this.showResultsSection();
        this.showLoading();

        try {
            const personality = this.getAIPersonality();
            const response = await fetch(`${this.apiUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    personality: this.currentMode
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayResults(data);

        } catch (error) {
            console.error('Search failed:', error);
            this.displayError(error.message);
        } finally {
            // Re-enable search button
            this.searchBtn.disabled = false;
            this.searchBtn.textContent = 'Send';
        }
    }

    showResultsSection() {
        this.heroSection.style.display = 'none';
        this.resultsContainer.style.display = 'block';
        this.mainContent.style.justifyContent = 'flex-start';
        this.mainContent.style.minHeight = 'auto';
    }

    showHeroSection() {
        this.resultsContainer.style.display = 'none';
        this.heroSection.style.display = 'block';
        this.mainContent.style.justifyContent = 'center';
        this.mainContent.style.minHeight = 'calc(100vh - 100px)';
        this.searchInput.value = '';
        this.searchBtn.style.opacity = '0.7';

        // Reset views to show regular search results by default
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('newsFeed').style.display = 'none';
    }

    showLoading() {
        const query = this.searchInput.value.trim();
        this.answerContent.innerHTML = `
            <div class="minimal-loading">
                <div class="loading-text">Researching ${query}...</div>
                <div class="loading-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        this.sourcesList.innerHTML = '';
        this.followUpQuestions.innerHTML = '';

    }

    displayResults(data) {
        // Store sources for citation links and conversation context
        this.currentSources = data.sources;
        this.conversationContext = {
            query: data.query,
            answer: data.answer,
            sources: data.sources,
            timestamp: new Date().toISOString()
        };

        // Display the AI-generated answer with clickable citations
        this.answerContent.innerHTML = this.formatAnswerWithCitations(data.answer, data.sources);

        // Display sources from web search
        this.displaySources(data.sources);

        // Display follow-up questions
        this.displayFollowUps(data.followUpQuestions);

        // Show contextual search option
        this.showContextualSearch();
    }

    showContextualSearch() {
        // Add contextual search input below the answer
        const contextualSearchHTML = `
            <div class="contextual-search" id="contextualSearch">
                <div class="contextual-header">
                    <h3>Continue this conversation</h3>
                    <p>Ask follow-up questions about "${this.conversationContext.query}"</p>
                </div>
                <div class="contextual-input-container">
                    <input type="text" id="contextualInput" placeholder="Ask a follow-up question..." class="contextual-input">
                    <button class="contextual-btn" id="contextualBtn">Ask</button>
                </div>
            </div>
        `;

        // Insert after answer content
        this.answerContent.insertAdjacentHTML('afterend', contextualSearchHTML);

        // Add event listeners
        const contextualInput = document.getElementById('contextualInput');
        const contextualBtn = document.getElementById('contextualBtn');

        const handleContextualSearch = () => {
            const followUpQuery = contextualInput.value.trim();
            if (!followUpQuery) return;

            // Combine with original context
            const contextualQuery = `Based on our previous discussion about "${this.conversationContext.query}", ${followUpQuery}`;

            // Update search input and trigger search
            this.searchInput.value = contextualQuery;
            this.handleSearch();
        };

        contextualBtn.addEventListener('click', handleContextualSearch);
        contextualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleContextualSearch();
            }
        });

        // Focus on contextual input for better UX
        setTimeout(() => contextualInput.focus(), 100);
    }

    formatAnswer(answer) {
        // Convert plain text answer to HTML with proper formatting
        return answer
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n- /g, '</p><ul><li>') // Lists
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/^/, '<p>') // Start with paragraph
            .replace(/$/, '</p>'); // End with paragraph
    }

    formatAnswerWithCitations(answer, sources) {
        // Professional text formatting with proper markdown handling
        let formattedAnswer = answer;

        // Handle bold text
        formattedAnswer = formattedAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Handle numbered lists properly
        formattedAnswer = formattedAnswer.replace(/(\d+\.\s+.*?)(?=\n\d+\.\s+|\n\n|\n[A-Z]|\n\*|$)/gs, (match) => {
            const items = match.split(/\n(?=\d+\.\s+)/).map(item => {
                const cleanItem = item.replace(/^\d+\.\s+/, '').trim();
                return `<li>${cleanItem}</li>`;
            });
            return `<ol>${items.join('')}</ol>`;
        });

        // Handle bullet points properly
        formattedAnswer = formattedAnswer.replace(/(\*\s+.*?)(?=\n\*\s+|\n\n|\n[A-Z]|\n\d+\.|$)/gs, (match) => {
            const items = match.split(/\n(?=\*\s+)/).map(item => {
                const cleanItem = item.replace(/^\*\s+/, '').trim();
                return `<li>${cleanItem}</li>`;
            });
            return `<ul>${items.join('')}</ul>`;
        });

        // Handle section headers (text followed by colon)
        formattedAnswer = formattedAnswer.replace(/^([A-Z][^:\n]*:)$/gm, '<h3>$1</h3>');

        // Handle paragraphs - split by double newlines
        const paragraphs = formattedAnswer.split(/\n\n+/).filter(p => p.trim());
        formattedAnswer = paragraphs.map(paragraph => {
            paragraph = paragraph.trim();

            // Skip if it's already wrapped in HTML tags
            if (paragraph.startsWith('<') && paragraph.endsWith('>')) {
                return paragraph;
            }

            // Handle single line breaks within paragraphs
            paragraph = paragraph.replace(/\n/g, ' ');

            return `<p>${paragraph}</p>`;
        }).join('');

        // Clean up any malformed HTML
        formattedAnswer = formattedAnswer
            .replace(/<\/p><ol>/g, '</p><ol>')
            .replace(/<\/ol><p>/g, '</ol><p>')
            .replace(/<\/p><ul>/g, '</p><ul>')
            .replace(/<\/ul><p>/g, '</ul><p>')
            .replace(/<\/p><h3>/g, '</p><h3>')
            .replace(/<\/h3><p>/g, '</h3><p>');

        // Make citations clickable - handle both single [1] and multiple [1, 2, 3] citations
        formattedAnswer = formattedAnswer.replace(/\[([0-9, ]+)\]/g, (match, numbers) => {
            const numberList = numbers.split(',').map(n => n.trim());
            const citationLinks = numberList.map(number => {
                const sourceIndex = parseInt(number) - 1;
                if (sourceIndex >= 0 && sourceIndex < sources.length) {
                    const source = sources[sourceIndex];
                    return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="citation-link" title="${source.title}">${number}</a>`;
                }
                return number;
            });
            return `[${citationLinks.join(', ')}]`;
        });

        return formattedAnswer;
    }

    displayError(message) {
        this.answerContent.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Search Error</h3>
                <p>Sorry, we encountered an issue while searching: <strong>${message}</strong></p>
                <p>Please try again or check your connection.</p>
                <button onclick="app.showHeroSection()" class="retry-btn">Try Again</button>
            </div>
        `;
        this.sourcesList.innerHTML = '';
        this.followUpQuestions.innerHTML = '';
    }

    handleSectionClick(section) {
        // Show results section and news feed
        this.showResultsSection();
        this.showNewsFeed(section);

        // Generate news feed for the selected section
        this.generateNewsFeed(section);
    }

    showNewsFeed(section) {
        // Hide regular search results and show news feed
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('newsFeed').style.display = 'block';

        // Update feed header based on section
        this.updateFeedHeader(section);

        // Show loading state
        this.showNewsLoading();
    }

    updateFeedHeader(section) {
        const sectionConfigs = {
            'geo-ai': {
                name: 'Geo-AI News',
                description: 'Latest developments in geospatial AI, mapping technology, and location intelligence',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>`
            },
            'academic': {
                name: 'Academic GPT',
                description: 'Research breakthroughs, scholarly insights, and academic trends',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>`
            },
            'startup': {
                name: 'Startup Radar',
                description: 'Funding rounds, emerging trends, and startup ecosystem insights',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>`
            },
            'creator': {
                name: 'Creator Copilot',
                description: 'Viral content strategies, platform updates, and creator economy trends',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>`
            },
            'legal': {
                name: 'LegalGPT',
                description: 'Legal developments, regulatory changes, and contract law updates',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h18z"/>
                    <path d="M3 12v7a2 2 0 0 0 2-2v-7"/>
                </svg>`
            },
            'dev': {
                name: 'DevGPT',
                description: 'Programming trends, new frameworks, and developer tools',
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16,18 22,12 16,6"/>
                    <polyline points="8,6 2,12 8,18"/>
                </svg>`
            }
        };

        const config = sectionConfigs[section];
        if (config) {
            document.getElementById('feedName').textContent = config.name;
            document.getElementById('feedDescription').textContent = config.description;
            document.getElementById('feedIcon').innerHTML = config.icon;
        }
    }

    showNewsLoading() {
        const newsGrid = document.getElementById('newsGrid');
        newsGrid.innerHTML = `
            <div class="news-loading">
                ${Array(6).fill().map(() => `
                    <div class="news-skeleton">
                        <div class="skeleton-image"></div>
                        <div class="skeleton-content">
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line medium"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async generateNewsFeed(section) {
        try {
            // Fetch real news data from backend
            const response = await fetch(`${this.apiUrl}/search/news/${section}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ options: { maxResults: 8 } })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayNewsArticles(data.articles, section);

        } catch (error) {
            console.error('News feed generation failed:', error);
            this.displayNewsError();
        }
    }



    displayNewsArticles(articles, section) {
        const newsGrid = document.getElementById('newsGrid');

        newsGrid.innerHTML = articles.map((article, index) => `
            <div class="news-article ${article.featured ? 'featured' : ''}" data-category="${section}" onclick="app.openStory('${section}', ${index})">
                <div class="article-image" style="background-image: url('${article.thumbnail}'); background-size: cover; background-position: center;">
                    ${!article.thumbnail || article.thumbnail.includes('placeholder') ? `<span>${article.sources?.[0]?.domain || 'Multiple Sources'}</span>` : ''}
                </div>
                <div class="article-content">
                    <div class="article-category">${article.category}</div>
                    <h3 class="article-headline">${article.headline}</h3>
                    <p class="article-summary">${article.summary}</p>
                    <div class="article-meta">
                        <div class="article-time">${article.time}</div>
                        <div class="article-engagement">
                            <div class="engagement-item">
                                <span>📰</span>
                                <span>${article.sourceCount || 1} source${(article.sourceCount || 1) > 1 ? 's' : ''}</span>
                            </div>
                            <div class="engagement-item">
                                <span>👁</span>
                                <span>${Math.floor(Math.random() * 1000) + 100}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Store articles for detailed view
        this.currentArticles = articles;
    }

    displayNewsError() {
        const newsGrid = document.getElementById('newsGrid');
        newsGrid.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Unable to Load News Feed</h3>
                <p>Sorry, we couldn't fetch the latest updates. Please try again.</p>
                <button onclick="app.showHeroSection()" class="retry-btn">Back to Home</button>
            </div>
        `;
    }

    openArticle(section, articleIndex, url) {
        // Open the actual article URL in a new tab
        if (url && url !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            console.error('No URL available for this article');
        }
    }

    openStory(section, storyIndex) {
        // Get the story data
        const story = this.currentArticles?.[storyIndex];
        if (!story) {
            console.error('Story not found');
            return;
        }

        // Create detailed story view
        this.showDetailedStory(story, section);
    }

    showDetailedStory(story, section) {
        // Hide news feed and show detailed story view
        document.getElementById('newsFeed').style.display = 'none';

        // Create detailed story HTML
        const detailedStoryHTML = `
            <div class="detailed-story" id="detailedStory">
                <div class="story-header">
                    <button class="back-to-feed-btn" onclick="app.backToNewsFeed('${section}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to ${this.getSectionName(section)}
                    </button>
                </div>

                <article class="story-content">
                    <div class="story-category">${story.category}</div>
                    <h1 class="story-headline">${story.headline}</h1>
                    
                    <div class="story-meta">
                        <span class="story-time">${story.time}</span>
                        <span class="story-sources-count">${story.sourceCount || story.sources?.length || 1} sources</span>
                    </div>

                    <div class="story-image" style="background-image: url('${story.thumbnail}'); background-size: cover; background-position: center;">
                        ${!story.thumbnail || story.thumbnail.includes('placeholder') ? `<span>AI-Generated Visual</span>` : ''}
                    </div>

                    <div class="story-summary">
                        <h2>Summary</h2>
                        <p>${story.summary}</p>
                    </div>

                    ${story.aiAnalysis ? `
                        <div class="story-analysis">
                            <h2>AI Analysis</h2>
                            <p>${story.aiAnalysis}</p>
                        </div>
                    ` : ''}

                    <div class="story-sources">
                        <h2>Sources</h2>
                        <div class="sources-grid">
                            ${story.sources?.map(source => `
                                <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-card">
                                    <div class="source-domain">${source.domain}</div>
                                    <div class="source-title">${source.title}</div>
                                    <div class="source-date">${source.publishedDate ? new Date(source.publishedDate).toLocaleDateString() : 'Recent'}</div>
                                </a>
                            `).join('') || ''}
                        </div>
                    </div>
                </article>
            </div>
        `;

        // Insert the detailed story view
        this.resultsContainer.insertAdjacentHTML('beforeend', detailedStoryHTML);
    }

    backToNewsFeed(section) {
        // Remove detailed story view
        const detailedStory = document.getElementById('detailedStory');
        if (detailedStory) {
            detailedStory.remove();
        }

        // Show news feed again
        document.getElementById('newsFeed').style.display = 'block';
    }

    getSectionName(section) {
        const names = {
            'geo-ai': 'Geo-AI News',
            'academic': 'Academic GPT',
            'startup': 'Startup Radar',
            'creator': 'Creator Copilot',
            'legal': 'LegalGPT',
            'dev': 'DevGPT'
        };
        return names[section] || 'News Feed';
    }



    displaySources(sources) {
        this.sourcesList.innerHTML = sources.map(source => `
            <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-item">
                <div class="source-title">${source.title}</div>
                <div class="source-url">${source.url}</div>
                <div class="source-snippet">${source.snippet}</div>
            </a>
        `).join('');
    }

    displayFollowUps(questions) {
        this.followUpQuestions.innerHTML = questions.map(question => `
            <button class="follow-up-question" onclick="app.searchInput.value='${question}'; app.handleSearch();">
                ${question}
            </button>
        `).join('');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Mode System Implementation
    initModeSystem() {
        // Initialize navigation
        this.initNavigation();

        // Load saved workspace if exists
        this.loadCurrentWorkspace();

        // Update UI based on mode
        this.updateModeUI();

        // Show static previews for sections (no API calls)
        if (this.currentMode === 'home' || this.currentMode === 'general') {
            this.showStaticSectionPreviews();
        }
    }

    initNavigation() {
        // Initialize spotlight search
        this.initSpotlightSearch();

        // Update section cards to use new mode system
        document.querySelectorAll('.section-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                const section = card.dataset.section;

                if (mode) {
                    this.switchMode(mode);
                    // If it's a news mode, show the feed
                    if (['newsmap', 'scholar', 'launchlens', 'viralforge', 'legalai'].includes(mode)) {
                        // Map mode to correct backend section
                        const sectionMapping = {
                            'newsmap': 'geo-ai',
                            'scholar': 'academic',
                            'launchlens': 'startup',
                            'viralforge': 'creator',
                            'legalai': 'legal'
                        };
                        const backendSection = sectionMapping[mode] || section;
                        setTimeout(() => this.handleSectionClick(backendSection), 300);
                    }
                }
            });
        });
    }

    initSpotlightSearch() {
        const spotlightTrigger = document.getElementById('spotlightTrigger');
        const spotlightModal = document.getElementById('spotlightModal');
        const spotlightBackdrop = document.getElementById('spotlightBackdrop');
        const spotlightClose = document.getElementById('spotlightClose');
        const spotlightInput = document.getElementById('spotlightInput');

        // Open spotlight modal
        const openSpotlight = () => {
            spotlightModal.classList.add('show');
            spotlightInput.focus();
            this.resetSpotlightSelection();
        };

        // Close spotlight modal
        const closeSpotlight = () => {
            spotlightModal.classList.remove('show');
            spotlightInput.value = '';
            this.resetSpotlightSelection();
        };

        // Event listeners
        spotlightTrigger.addEventListener('click', openSpotlight);
        spotlightBackdrop.addEventListener('click', closeSpotlight);
        spotlightClose.addEventListener('click', closeSpotlight);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + / to open spotlight
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                openSpotlight();
            }

            // Escape to close
            if (e.key === 'Escape' && spotlightModal.classList.contains('show')) {
                closeSpotlight();
            }

            // Arrow navigation and Enter selection
            if (spotlightModal.classList.contains('show')) {
                this.handleSpotlightKeyboard(e);
            }
        });

        // Search functionality
        spotlightInput.addEventListener('input', (e) => {
            this.filterSpotlightResults(e.target.value);
        });

        // Click on spotlight items
        document.querySelectorAll('.spotlight-item').forEach(item => {
            item.addEventListener('click', () => {
                const mode = item.dataset.mode;
                this.switchMode(mode);
                closeSpotlight();
            });
        });
    }

    resetSpotlightSelection() {
        document.querySelectorAll('.spotlight-item').forEach(item => {
            item.classList.remove('active');
        });
        // Set first item as active
        const firstItem = document.querySelector('.spotlight-item');
        if (firstItem) {
            firstItem.classList.add('active');
        }
    }

    handleSpotlightKeyboard(e) {
        const items = document.querySelectorAll('.spotlight-item:not([style*="display: none"])');
        const activeItem = document.querySelector('.spotlight-item.active');
        let activeIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                const mode = activeItem.dataset.mode;
                this.switchMode(mode);
                document.getElementById('spotlightModal').classList.remove('show');
            }
            return;
        } else {
            return;
        }

        // Update active state
        document.querySelectorAll('.spotlight-item').forEach(item => {
            item.classList.remove('active');
        });
        if (items[activeIndex]) {
            items[activeIndex].classList.add('active');
        }
    }

    filterSpotlightResults(query) {
        const items = document.querySelectorAll('.spotlight-item');
        const lowerQuery = query.toLowerCase();

        items.forEach(item => {
            const title = item.querySelector('.item-title').textContent.toLowerCase();
            const description = item.querySelector('.item-description').textContent.toLowerCase();
            const badge = item.querySelector('.item-badge').textContent.toLowerCase();

            const matches = title.includes(lowerQuery) ||
                description.includes(lowerQuery) ||
                badge.includes(lowerQuery);

            item.style.display = matches ? 'flex' : 'none';
        });

        // Reset selection to first visible item
        this.resetSpotlightSelection();
    }

    switchMode(mode) {
        if (this.currentMode === mode) return;

        console.log(`🔄 Switching to ${mode} mode`);

        // Update current mode
        this.currentMode = mode;

        // Update spotlight trigger text
        this.updateCurrentModeText();

        // Update UI based on mode
        this.updateModeUI();

        // Update search placeholder and suggestions
        this.updateSearchInterface();

        // Save current mode
        this.saveCurrentMode();
    }

    updateCurrentModeText() {
        const modeNames = {
            home: 'Choose Mode',
            general: 'AskAnything',
            newsmap: 'NewsMap',
            scholar: 'ScholarGPT',
            launchlens: 'LaunchLens',
            viralforge: 'ViralForge',
            legalai: 'LegalAI'
        };

        const currentModeText = document.getElementById('currentModeText');
        if (currentModeText) {
            currentModeText.textContent = modeNames[this.currentMode] || 'Choose Mode';
        }
    }

    updateModeUI() {
        const modeConfigs = {
            home: {
                title: 'Your AI Powered Content Research Assistant',
                subtitle: 'Do research for content in seconds, so you can spend more time going viral.',
                showSections: true
            },
            general: {
                title: 'AskAnything - Your Default Brain',
                subtitle: 'Get comprehensive answers to any question with AI-powered research across all domains.',
                showSections: true
            },
            newsmap: {
                title: 'NewsMap - Real-World News Radar',
                subtitle: 'Geographic intelligence and location-based news insights.',
                showSections: false
            },
            scholar: {
                title: 'ScholarGPT - Lazy Student\'s PhD Mode',
                subtitle: 'Academic research, citations, and scholarly insights made simple.',
                showSections: false
            },
            launchlens: {
                title: 'LaunchLens - Startup World Spyglass',
                subtitle: 'Funding rounds, market trends, and startup ecosystem intelligence.',
                showSections: false
            },
            viralforge: {
                title: 'ViralForge - The Viral Content Engine',
                subtitle: 'Platform updates, algorithm insights, and viral content strategies.',
                showSections: false
            },
            legalai: {
                title: 'LegalAI - Contracts Simplified',
                subtitle: 'Legal developments, regulatory changes, and contract analysis.',
                showSections: false
            }
        };

        const config = modeConfigs[this.currentMode] || modeConfigs.home;

        // Update hero section content
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const sectionsContainer = document.querySelector('.specialized-sections');

        if (heroTitle) heroTitle.textContent = config.title;
        if (heroSubtitle) heroSubtitle.textContent = config.subtitle;
        if (sectionsContainer) {
            sectionsContainer.style.display = config.showSections ? 'block' : 'none';
        }
    }

    updateSearchInterface() {
        const modePrompts = {
            general: {
                placeholder: 'Ask me anything...',
                suggestions: ['Explain quantum computing', 'Latest AI developments', 'How does blockchain work', 'Climate change solutions']
            },
            newsmap: {
                placeholder: 'Search geographic news and events...',
                suggestions: ['Satellite imagery analysis', 'Climate impact mapping', 'Disaster response updates', 'Smart city developments']
            },
            scholar: {
                placeholder: 'Research academic topics...',
                suggestions: ['Recent quantum breakthroughs', 'Medical research trends', 'Academic writing tips', 'Research methodology']
            },
            launchlens: {
                placeholder: 'Explore startup ecosystem...',
                suggestions: ['Latest funding rounds', 'Unicorn companies 2024', 'VC investment trends', 'Startup market analysis']
            },
            viralforge: {
                placeholder: 'Create viral content strategies...',
                suggestions: ['TikTok algorithm tips', 'Viral content ideas', 'Platform updates', 'Creator monetization']
            },
            legalai: {
                placeholder: 'Legal research and analysis...',
                suggestions: ['AI regulation updates', 'Contract law changes', 'Privacy compliance', 'Legal tech trends']
            }
        };

        const config = modePrompts[this.currentMode];
        if (config) {
            this.searchInput.placeholder = config.placeholder;
            this.updateSuggestionChips(config.suggestions);
        }
    }

    updateSuggestionChips(suggestions) {
        const suggestionsContainer = document.querySelector('.suggestions');
        if (suggestionsContainer && suggestions) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion =>
                `<button class="suggestion-chip">${suggestion}</button>`
            ).join('');

            // Re-add event listeners
            suggestionsContainer.querySelectorAll('.suggestion-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    this.searchInput.value = chip.textContent;
                    this.handleSearch();
                });
            });
        }
    }

    // Workspace Management
    loadWorkspaces() {
        try {
            return JSON.parse(localStorage.getItem('askMeFrWorkspaces') || '{}');
        } catch {
            return {};
        }
    }

    saveWorkspace(name, data) {
        this.workspaces[name] = {
            ...data,
            timestamp: new Date().toISOString(),
            mode: this.currentMode
        };
        localStorage.setItem('askMeFrWorkspaces', JSON.stringify(this.workspaces));
        console.log(`💾 Workspace "${name}" saved`);
    }

    loadWorkspace(name) {
        const workspace = this.workspaces[name];
        if (workspace) {
            this.currentWorkspace = workspace;
            this.switchMode(workspace.mode);
            if (workspace.query) {
                this.searchInput.value = workspace.query;
            }
            console.log(`📂 Workspace "${name}" loaded`);
        }
    }

    saveCurrentMode() {
        localStorage.setItem('askMeFrCurrentMode', this.currentMode);
    }

    loadCurrentWorkspace() {
        const savedMode = localStorage.getItem('askMeFrCurrentMode');
        if (savedMode && savedMode !== 'home') {
            this.switchMode(savedMode);
        }
    }

    // AI Personality System
    getAIPersonality() {
        const personalities = {
            general: {
                systemPrompt: 'You are a helpful AI assistant. Provide comprehensive, well-researched answers in a friendly and professional tone.',
                tone: 'professional',
                format: 'comprehensive'
            },
            newsmap: {
                systemPrompt: 'You are a geospatial intelligence analyst. Focus on location-based insights, geographic context, and real-world implications. Use precise, analytical language.',
                tone: 'analytical',
                format: 'structured'
            },
            scholar: {
                systemPrompt: 'You are an academic research assistant. Provide scholarly, citation-heavy responses with formal language. Focus on peer-reviewed sources and academic rigor.',
                tone: 'formal',
                format: 'academic'
            },
            launchlens: {
                systemPrompt: 'You are a startup ecosystem analyst. Use concise, bullet-point format with key metrics and data. Focus on funding, growth, and market dynamics.',
                tone: 'concise',
                format: 'bullet-points'
            },
            viralforge: {
                systemPrompt: 'You are a viral content strategist. Use casual, bold, and engaging language. Focus on trends, engagement tactics, and platform-specific insights.',
                tone: 'casual',
                format: 'engaging'
            },
            legalai: {
                systemPrompt: 'You are a legal technology analyst. Provide precise, compliance-focused responses with clear implications and actionable insights.',
                tone: 'precise',
                format: 'structured'
            }
        };

        return personalities[this.currentMode] || personalities.general;
    }

    // Enhanced search with personality
    async handleSearchWithPersonality() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        const personality = this.getAIPersonality();

        // Save current query to workspace
        if (this.currentMode !== 'home') {
            this.saveWorkspace(`${this.currentMode}_recent`, {
                query,
                mode: this.currentMode,
                timestamp: new Date().toISOString()
            });
        }

        // Use existing handleSearch but with personality context
        return this.handleSearch();
    }

    // Show static previews for section cards (no API calls)
    showStaticSectionPreviews() {
        console.log('📋 Showing static section previews...');
        
        const staticPreviews = {
            'newsmap': [
                'Geographic intelligence and mapping insights',
                'Location-based news and spatial analysis'
            ],
            'academic': [
                'Latest research breakthroughs and discoveries',
                'Scholarly insights and academic trends'
            ],
            'startup': [
                'Funding rounds and venture capital news',
                'Startup ecosystem and market analysis'
            ],
            'creator': [
                'Platform updates and algorithm changes',
                'Viral content strategies and creator tools'
            ],
            'legal': [
                'Legal technology and regulatory updates',
                'Contract analysis and compliance news'
            ],
            'dev': [
                'Programming trends and developer tools',
                'Software engineering and tech updates'
            ]
        };

        // Update each section with static previews
        Object.entries(staticPreviews).forEach(([sectionId, previews]) => {
            this.updateSectionPreview(sectionId, previews.map(text => ({ headline: text })));
        });
    }

    updateSectionPreview(sectionId, articles) {
        const sectionCard = document.querySelector(`[data-section="${sectionId}"], [data-mode="${sectionId}"]`);
        if (!sectionCard) return;

        const previewContainer = sectionCard.querySelector('.section-preview');
        if (!previewContainer) return;

        // Update preview with real headlines
        const newsItems = articles.slice(0, 2).map(article =>
            `<div class="news-item">${article.headline || article.title || 'Latest updates...'}</div>`
        ).join('');

        previewContainer.innerHTML = newsItems;

        // Add subtle animation
        previewContainer.style.opacity = '0';
        setTimeout(() => {
            previewContainer.style.transition = 'opacity 0.3s ease';
            previewContainer.style.opacity = '1';
        }, Math.random() * 500); // Stagger the animations
    }
}

// Initialize the app
const app = new AskMeFr();


