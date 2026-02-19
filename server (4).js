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


// Proxy endpoint for Yahoo Finance (stocks)
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    );
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Stock fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for CoinGecko (crypto)
app.get('/api/crypto/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Crypto fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Fetch top stock gainers from Yahoo Finance
app.get('/api/trending/gainers', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/screener?crumb=&lang=en-US&region=US&formatted=true&corsDomain=finance.yahoo.com&count=10&offset=0&quoteType=EQUITY&sortField=percentchange&sortType=DESC&query=%7B%22operator%22%3A%22AND%22%2C%22operands%22%3A%5B%7B%22operator%22%3A%22or%22%2C%22operands%22%3A%5B%7B%22operator%22%3A%22EQ%22%2C%22operands%22%3A%5B%22region%22%2C%22us%22%5D%7D%5D%7D%2C%7B%22operator%22%3A%22gt%22%2C%22operands%22%3A%5B%22intradaymarketcap%22%2C2000000000%5D%7D%2C%7B%22operator%22%3A%22eq%22%2C%22operands%22%3A%5B%22exchange%22%2C%22NMS%22%5D%7D%5D%7D',
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✓ Gainers fetched:', data.finance?.result?.[0]?.quotes?.length || 0, 'stocks');
    res.json(data);
  } catch (error) {
    console.error('Gainers fetch error:', error.message);
    res.status(500).json({ error: error.message, endpoint: 'gainers' });
  }
});

// Fetch most active stocks from Yahoo Finance  
app.get('/api/trending/active', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/screener?crumb=&lang=en-US&region=US&formatted=true&corsDomain=finance.yahoo.com&count=10&offset=0&quoteType=EQUITY&sortField=dayvolume&sortType=DESC&query=%7B%22operator%22%3A%22AND%22%2C%22operands%22%3A%5B%7B%22operator%22%3A%22or%22%2C%22operands%22%3A%5B%7B%22operator%22%3A%22EQ%22%2C%22operands%22%3A%5B%22region%22%2C%22us%22%5D%7D%5D%7D%2C%7B%22operator%22%3A%22gt%22%2C%22operands%22%3A%5B%22intradaymarketcap%22%2C2000000000%5D%7D%5D%7D',
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✓ Most active fetched:', data.finance?.result?.[0]?.quotes?.length || 0, 'stocks');
    res.json(data);
  } catch (error) {
    console.error('Most active fetch error:', error.message);
    res.status(500).json({ error: error.message, endpoint: 'active' });
  }
});

// Fetch trending crypto prices from CoinCap (no auth required)
app.get('/api/trending/crypto', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      'https://api.coincap.io/v2/assets?limit=6',
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`CoinCap API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✓ Crypto fetched:', data.data?.length || 0, 'assets');
    res.json(data);
  } catch (error) {
    console.error('Crypto fetch error:', error.message);
    res.status(500).json({ error: error.message, endpoint: 'crypto' });
  }
});

app.listen(PORT, () => {
  console.log(`Veritas API Proxy running on port ${PORT}`);
});
