const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Veritas API Proxy is running' });
});

// Proxy endpoint for Anthropic API
app.post('/api/claude', async (req, res) => {
  try {
    const { apiKey, system, messages, maxTokens } = req.body;

    // Validate API key
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return res.status(400).json({ 
        error: 'Invalid API key format. Key must start with sk-ant-' 
      });
    }

    // Make request to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 1000,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();

    // Return response with same status code
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Veritas API Proxy running on port ${PORT}`);
});
