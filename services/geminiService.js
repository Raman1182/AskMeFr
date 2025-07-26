const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateAnswer(query, searchResults, context = {}) {
    try {
      console.log(`🤖 Generating answer with Gemini for: "${query}"`);

      const prompt = this.buildPrompt(query, searchResults, context);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      console.log(`✅ Gemini generated ${answer.length} character response`);
      
      return {
        answer: answer.trim(),
        model: 'gemini-1.5-flash',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Gemini generation error:', error.message);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      }
      
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Gemini rate limit exceeded');
      }
      
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  buildPrompt(query, searchResults, context) {
    const sources = searchResults.map((result, index) => 
      `[${index + 1}] ${result.title}\nURL: ${result.url}\nContent: ${result.content}\n`
    ).join('\n');

    // Get personality-specific prompt
    const personalityPrompt = this.getPersonalityPrompt(context.personality || 'general');

    return `${personalityPrompt}

QUERY: "${query}"

SEARCH RESULTS:
${sources}

INSTRUCTIONS:
1. Use the search results as your primary source of information
2. IMPORTANT: Cite sources using [1], [2], [3] etc. when referencing information from the search results
3. Synthesize information from multiple sources when possible
4. Be factual, accurate, and cite-worthy
5. Structure your response according to your personality mode
6. Focus on being helpful and actionable
7. Always include citations [1], [2] etc. when mentioning facts or data from sources
8. Don't mention that you're using search results - present the information naturally
9. If information is conflicting between sources, acknowledge different perspectives

FORMAT YOUR RESPONSE:
- Start with a clear, direct answer
- Provide detailed explanation with key points
- Use appropriate formatting for your personality mode
- End with practical implications or next steps when relevant

Remember: Adapt your tone and format to match your assigned personality while maintaining accuracy and helpfulness.`;
  }

  getPersonalityPrompt(personality) {
    const personalities = {
      general: `You are a helpful AI research assistant. Provide comprehensive, well-researched answers in a friendly and professional tone. Use clear explanations and maintain a balanced, informative approach.`,
      
      newsmap: `You are a geospatial intelligence analyst specializing in location-based insights and geographic context. Use precise, analytical language with focus on:
- Geographic implications and spatial relationships
- Real-world impact and location-specific details
- Environmental and infrastructure considerations
- Data-driven geographic analysis
Tone: Analytical, precise, fact-focused`,
      
      scholar: `You are an academic research assistant with expertise in scholarly communication. Provide formal, citation-heavy responses with:
- Academic rigor and scholarly language
- Focus on peer-reviewed sources and research methodology
- Formal tone with proper academic structure
- Emphasis on evidence-based conclusions
- Research implications and further study suggestions
Tone: Formal, scholarly, research-oriented`,
      
      launchlens: `You are a startup ecosystem analyst focused on venture capital and business intelligence. Use concise, data-driven format with:
- Key metrics, funding amounts, and growth statistics
- Bullet-point summaries for quick scanning
- Market dynamics and competitive analysis
- Investment trends and business implications
- Focus on actionable business insights
Tone: Concise, metric-focused, business-oriented`,
      
      viralforge: `You are a viral content strategist helping creators make engaging content. Use casual, bold, and engaging language with:
- Trend analysis and platform-specific insights
- Actionable content creation tips
- Engagement tactics and viral strategies
- Platform algorithm understanding
- Creator economy insights
Tone: Casual, engaging, trend-savvy, creator-friendly`,
      
      legalai: `You are a legal technology analyst specializing in compliance and regulatory analysis. Provide precise, structured responses with:
- Clear legal implications and compliance requirements
- Regulatory framework analysis
- Risk assessment and mitigation strategies
- Actionable compliance guidance
- Legal precedent and regulatory trends
Tone: Precise, compliance-focused, risk-aware`
    };

    return personalities[personality] || personalities.general;
  }

  async generateFollowUpQuestions(query, answer) {
    try {
      const prompt = `Based on this query: "${query}" and the comprehensive answer provided, generate 4 relevant follow-up questions that a content creator might want to explore further.

The questions should be:
1. Specific and actionable
2. Related to content creation (podcasts, videos, newsletters, social media)
3. Help dive deeper into the topic
4. Be naturally curious extensions of the original query

Format: Return only the 4 questions, one per line, without numbering or bullet points.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const questions = response.text().trim().split('\n').filter(q => q.trim());

      return questions.slice(0, 4); // Ensure we only return 4 questions

    } catch (error) {
      console.error('❌ Follow-up generation error:', error.message);
      
      // Return default questions if generation fails
      return [
        "What are the practical applications of this topic?",
        "How is this field evolving currently?",
        "What are the main challenges or controversies?",
        "How can this information be used for content creation?"
      ];
    }
  }
}

module.exports = GeminiService;