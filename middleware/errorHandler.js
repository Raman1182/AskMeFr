const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Gemini API errors
  if (err.message?.includes('API_KEY_INVALID')) {
    error = {
      message: 'Invalid Gemini API key',
      status: 401
    };
  }

  // Tavily API errors
  if (err.response?.status === 401 && err.config?.url?.includes('tavily')) {
    error = {
      message: 'Invalid Tavily API key',
      status: 401
    };
  }

  // Rate limit errors
  if (err.message?.includes('rate limit')) {
    error = {
      message: 'Rate limit exceeded. Please try again later.',
      status: 429
    };
  }

  // Network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    error = {
      message: 'External service unavailable',
      status: 503
    };
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };