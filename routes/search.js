const express = require('express');
const TavilyService = require('../services/tavilyService');
const GeminiService = require('../services/geminiService');

const router = express.Router();

// Initialize services
let tavilyService, geminiService;

try {
  tavilyService = new TavilyService();
  geminiService = new GeminiService();
  console.log('✅ Services initialized successfully');
} catch (error) {
  console.error('❌ Service initialization failed:', error.message);
}

// POST /api/search/news/:section
router.post('/news/:section', async (req, res, next) => {
  try {
    const { section } = req.params;
    const { options = {} } = req.body;

    if (!tavilyService || !geminiService) {
      return res.status(503).json({
        error: 'Search services are not properly configured. Please check API keys.'
      });
    }

    console.log(`🗞️ Fetching news for section: ${section}`);

    // Define section-specific search queries
    const sectionQueries = {
      'geo-ai': 'latest geospatial AI satellite mapping location intelligence news',
      'academic': 'recent academic research breakthroughs scientific discoveries',
      'startup': 'startup funding rounds venture capital business news',
      'creator': 'social media creator economy platform updates viral content',
      'legal': 'legal technology AI regulation privacy law updates',
      'dev': 'programming developer tools software engineering news'
    };

    const query = sectionQueries[section];
    if (!query) {
      return res.status(400).json({ error: 'Invalid section specified' });
    }

    // Search for news articles
    const searchResults = await tavilyService.search(query, {
      maxResults: 15, // Get more articles to group into stories
      depth: 'advanced'
    });

    // Group articles into stories and generate AI summaries
    const stories = await generateStories(searchResults.results, section, geminiService);

    // Format stories for news feed
    const articles = stories.map((story, index) => ({
      id: index,
      headline: story.headline,
      summary: story.summary,
      aiAnalysis: story.analysis,
      sources: story.sources,
      thumbnail: story.thumbnail,
      category: story.category,
      time: story.time,
      sourceCount: story.sources.length,
      featured: index === 0 // First story is featured
    }));

    const response = {
      section,
      articles,
      metadata: {
        searchTime: searchResults.response_time,
        resultCount: searchResults.results.length,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ News feed generated for ${section}: ${articles.length} articles`);
    res.json(response);

  } catch (error) {
    console.error('❌ News feed request failed:', error.message);
    next(error);
  }
});

// Helper functions
function extractThumbnail(result) {
  // Try to extract thumbnail from various sources
  if (result.image_url) {
    return result.image_url;
  }
  
  // Generate a placeholder based on the domain
  const domain = extractDomain(result.url);
  const colors = ['3498db', 'e74c3c', 'f39c12', '9b59b6', '2ecc71', '1a1a1a'];
  const color = colors[domain.length % colors.length];
  
  return `https://via.placeholder.com/400x200/${color}/ffffff?text=${encodeURIComponent(domain)}`;
}

function categorizeArticle(title, section) {
  const categories = {
    'geo-ai': ['Environmental Tech', 'Navigation', 'Climate Tech', 'Smart Cities', 'Emergency Tech'],
    'academic': ['Quantum Physics', 'Medical Research', 'Education', 'Climate Science', 'Neuroscience'],
    'startup': ['Healthcare', 'Fintech', 'Climate Tech', 'EdTech', 'Robotics'],
    'creator': ['Platform Updates', 'Instagram', 'YouTube', 'Virtual Influencers', 'Live Streaming'],
    'legal': ['AI Regulation', 'Privacy Law', 'Blockchain Law', 'Data Protection', 'Employment Law'],
    'dev': ['Frontend', 'AI Tools', 'Programming Languages', 'DevOps', 'Web Technologies']
  };

  const sectionCategories = categories[section] || ['Technology'];
  
  // Simple keyword matching to categorize
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('ai') || titleLower.includes('artificial intelligence')) {
    return sectionCategories[0];
  }
  if (titleLower.includes('startup') || titleLower.includes('funding')) {
    return sectionCategories[1] || sectionCategories[0];
  }
  if (titleLower.includes('research') || titleLower.includes('study')) {
    return sectionCategories[2] || sectionCategories[0];
  }
  
  // Return a random category from the section
  return sectionCategories[Math.floor(Math.random() * sectionCategories.length)];
}

function formatTime(publishedDate) {
  if (!publishedDate) {
    // Generate a random recent time
    const hoursAgo = Math.floor(Math.random() * 24) + 1;
    return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
  }
  
  const now = new Date();
  const published = new Date(publishedDate);
  const diffMs = now - published;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) {
    return 'Just now';
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return published.toLocaleDateString();
  }
}

function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}

// Generate AI-synthesized stories from multiple articles
async function generateStories(articles, section, geminiService) {
  try {
    // Group articles by topic similarity
    const storyGroups = groupArticlesByTopic(articles, section);
    
    const stories = [];
    
    for (const group of storyGroups) {
      // Generate AI story synthesis for each group
      const story = await synthesizeStory(group, section, geminiService);
      if (story) {
        stories.push(story);
      }
    }
    
    return stories.slice(0, 6); // Return top 6 stories
    
  } catch (error) {
    console.error('❌ Story generation failed:', error.message);
    // Fallback to individual articles if story generation fails
    return articles.slice(0, 6).map((article, index) => ({
      headline: article.title,
      summary: article.content?.substring(0, 200) + '...' || 'No summary available',
      analysis: 'AI analysis temporarily unavailable',
      sources: [{ title: article.title, url: article.url, domain: extractDomain(article.url) }],
      thumbnail: extractThumbnail(article),
      category: categorizeArticle(article.title, section),
      time: formatTime(article.published_date),
      featured: index === 0
    }));
  }
}

function groupArticlesByTopic(articles, section) {
  // Simple topic grouping based on keywords and themes
  const groups = [];
  const used = new Set();
  
  // Define topic keywords for each section
  const topicKeywords = {
    'geo-ai': [
      ['satellite', 'imagery', 'earth', 'mapping'],
      ['climate', 'weather', 'environmental'],
      ['navigation', 'gps', 'location'],
      ['smart city', 'urban', 'infrastructure'],
      ['disaster', 'emergency', 'response']
    ],
    'academic': [
      ['quantum', 'computing', 'physics'],
      ['medical', 'health', 'drug', 'research'],
      ['ai', 'machine learning', 'artificial intelligence'],
      ['climate', 'environment', 'sustainability'],
      ['neuroscience', 'brain', 'cognitive']
    ],
    'startup': [
      ['funding', 'investment', 'venture capital'],
      ['fintech', 'financial', 'payment'],
      ['healthcare', 'medical', 'biotech'],
      ['ai', 'artificial intelligence', 'machine learning'],
      ['climate tech', 'clean energy', 'sustainability']
    ],
    'creator': [
      ['tiktok', 'instagram', 'youtube'],
      ['algorithm', 'platform', 'update'],
      ['influencer', 'creator', 'content'],
      ['monetization', 'revenue', 'earnings'],
      ['viral', 'trending', 'engagement']
    ],
    'legal': [
      ['ai regulation', 'artificial intelligence', 'compliance'],
      ['privacy', 'data protection', 'gdpr'],
      ['blockchain', 'crypto', 'smart contract'],
      ['employment', 'remote work', 'labor'],
      ['intellectual property', 'patent', 'copyright']
    ],
    'dev': [
      ['react', 'vue', 'angular', 'frontend'],
      ['ai tools', 'copilot', 'coding assistant'],
      ['rust', 'go', 'python', 'javascript'],
      ['kubernetes', 'docker', 'devops'],
      ['security', 'vulnerability', 'cybersecurity']
    ]
  };

  const keywords = topicKeywords[section] || [];
  
  // Group articles by topic keywords
  for (const keywordGroup of keywords) {
    const groupArticles = [];
    
    for (let i = 0; i < articles.length; i++) {
      if (used.has(i)) continue;
      
      const article = articles[i];
      const titleLower = article.title.toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      
      // Check if article matches any keyword in the group
      const matches = keywordGroup.some(keyword => 
        titleLower.includes(keyword.toLowerCase()) || 
        contentLower.includes(keyword.toLowerCase())
      );
      
      if (matches) {
        groupArticles.push({ ...article, index: i });
        used.add(i);
      }
    }
    
    if (groupArticles.length > 0) {
      groups.push(groupArticles);
    }
  }
  
  // Add remaining articles as individual stories
  for (let i = 0; i < articles.length; i++) {
    if (!used.has(i)) {
      groups.push([{ ...articles[i], index: i }]);
    }
  }
  
  return groups.slice(0, 6); // Return top 6 story groups
}

async function synthesizeStory(articleGroup, section, geminiService) {
  try {
    const articles = articleGroup.slice(0, 4); // Use max 4 articles per story
    
    // Prepare articles for AI synthesis
    const articlesText = articles.map((article, index) => 
      `Article ${index + 1}:\nTitle: ${article.title}\nContent: ${article.content?.substring(0, 500) || 'No content available'}\nURL: ${article.url}\n`
    ).join('\n');

    const prompt = `You are an AI journalist creating a comprehensive story by synthesizing multiple news articles. Your task is to create a cohesive narrative that combines insights from all provided articles.

ARTICLES TO SYNTHESIZE:
${articlesText}

SECTION CONTEXT: ${section}

INSTRUCTIONS:
1. Create a compelling headline that captures the main theme across all articles
2. Write a comprehensive summary (150-200 words) that synthesizes key information from all articles
3. Provide insightful analysis (100-150 words) that adds context and explains significance
4. Use a tone appropriate for the ${section} audience
5. Focus on what's most important and actionable
6. Don't just summarize - provide synthesis and analysis

FORMAT YOUR RESPONSE AS JSON:
{
  "headline": "Your synthesized headline here",
  "summary": "Your comprehensive summary here", 
  "analysis": "Your insightful analysis here"
}

Remember: You're creating ONE cohesive story from multiple sources, not separate summaries.`;

    const result = await geminiService.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const storyData = JSON.parse(jsonMatch[0]);
    
    // Select best thumbnail from the articles
    const thumbnail = articles.find(a => extractThumbnail(a) && !extractThumbnail(a).includes('placeholder'))?.image_url || 
                     extractThumbnail(articles[0]);
    
    return {
      headline: storyData.headline,
      summary: storyData.summary,
      analysis: storyData.analysis,
      sources: articles.map(article => ({
        title: article.title,
        url: article.url,
        domain: extractDomain(article.url),
        publishedDate: article.published_date
      })),
      thumbnail,
      category: categorizeArticle(storyData.headline, section),
      time: formatTime(articles[0].published_date),
      featured: false
    };
    
  } catch (error) {
    console.error('❌ Story synthesis failed:', error.message);
    
    // Fallback to simple story creation
    const mainArticle = articleGroup[0];
    return {
      headline: mainArticle.title,
      summary: mainArticle.content?.substring(0, 200) + '...' || 'No summary available',
      analysis: 'This story combines insights from multiple sources to provide comprehensive coverage of this developing topic.',
      sources: articleGroup.map(article => ({
        title: article.title,
        url: article.url,
        domain: extractDomain(article.url),
        publishedDate: article.published_date
      })),
      thumbnail: extractThumbnail(mainArticle),
      category: categorizeArticle(mainArticle.title, section),
      time: formatTime(mainArticle.published_date),
      featured: false
    };
  }
}

// POST /api/search
router.post('/', async (req, res, next) => {
  try {
    const { query, options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query is required and must be a non-empty string'
      });
    }

    if (!tavilyService || !geminiService) {
      return res.status(503).json({
        error: 'Search services are not properly configured. Please check API keys.'
      });
    }

    const trimmedQuery = query.trim();
    console.log(`🔍 Processing search request: "${trimmedQuery}"`);

    // Step 1: Search the web with Tavily
    const searchResults = await tavilyService.search(trimmedQuery, {
      maxResults: options.maxResults || 6,
      depth: options.depth || 'advanced'
    });

    // Get AI personality from request (if provided)
    const personality = req.body.personality || 'general';
    
    // Step 2: Generate comprehensive answer with Gemini using personality
    const geminiResponse = await geminiService.generateAnswer(
      trimmedQuery, 
      searchResults.results,
      { originalQuery: trimmedQuery, personality }
    );

    // Step 3: Generate follow-up questions
    const followUpQuestions = await geminiService.generateFollowUpQuestions(
      trimmedQuery,
      geminiResponse.answer
    );

    // Step 4: Format response
    const response = {
      query: trimmedQuery,
      answer: geminiResponse.answer,
      sources: searchResults.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content?.substring(0, 200) + '...' || 'No preview available',
        publishedDate: result.published_date || null
      })),
      followUpQuestions,
      metadata: {
        searchTime: searchResults.response_time,
        resultCount: searchResults.results.length,
        model: geminiResponse.model,
        timestamp: geminiResponse.timestamp
      }
    };

    console.log(`✅ Search completed successfully for: "${trimmedQuery}"`);
    res.json(response);

  } catch (error) {
    console.error('❌ Search request failed:', error.message);
    next(error);
  }
});

// GET /api/search/suggestions
router.get('/suggestions', (req, res) => {
  const suggestions = [
    "Podcast Outline",
    "YouTube Video Research", 
    "Short Form Hook Ideas",
    "Newsletter Draft",
    "Social Media Content Ideas",
    "Trending Topics Analysis",
    "Content Strategy Tips",
    "Viral Content Examples"
  ];

  res.json({ suggestions });
});

// GET /api/search/health
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    services: {
      tavily: !!tavilyService,
      gemini: !!geminiService
    },
    timestamp: new Date().toISOString()
  };

  const allServicesHealthy = Object.values(health.services).every(Boolean);
  
  res.status(allServicesHealthy ? 200 : 503).json(health);
});

module.exports = router;