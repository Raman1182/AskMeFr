const axios = require('axios');

class TavilyService {
  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
    this.baseUrl = 'https://api.tavily.com';
    
    if (!this.apiKey) {
      throw new Error('TAVILY_API_KEY is required');
    }
  }

  async search(query, options = {}) {
    try {
      const searchParams = {
        api_key: this.apiKey,
        query: query,
        search_depth: options.depth || 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: options.maxResults || 8,
        include_domains: options.includeDomains || [],
        exclude_domains: options.excludeDomains || [],
        ...options
      };

      console.log(`🔍 Searching Tavily for: "${query}"`);
      
      const response = await axios.post(`${this.baseUrl}/search`, searchParams, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      const results = response.data;
      
      console.log(`✅ Tavily returned ${results.results?.length || 0} results`);
      
      return {
        answer: results.answer || '',
        results: results.results || [],
        query: results.query || query,
        response_time: results.response_time || 0
      };

    } catch (error) {
      console.error('❌ Tavily search error:', error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Tavily API key');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Tavily rate limit exceeded');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tavily search timeout');
      }
      
      throw new Error(`Tavily search failed: ${error.message}`);
    }
  }

  async getContext(query, options = {}) {
    try {
      const searchParams = {
        api_key: this.apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: true,
        max_results: options.maxResults || 5,
        ...options
      };

      const response = await axios.post(`${this.baseUrl}/search`, searchParams, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.results || [];

    } catch (error) {
      console.error('❌ Tavily context error:', error.message);
      throw error;
    }
  }
}

module.exports = TavilyService;