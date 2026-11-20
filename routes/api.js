'use strict';

const crypto = require('crypto');
const https = require('https');

const likedByStock = new Map();

function getStockQuote(stock) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${encodeURIComponent(stock)}/quote`;

  return new Promise((resolve, reject) => {
    https.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Stock price service returned ${response.statusCode}`));
          return;
        }

        try {
          const quote = JSON.parse(body);
          if (typeof quote === 'string') {
            resolve(null);
            return;
          }
          if (typeof quote.latestPrice !== 'number' || !Number.isFinite(quote.latestPrice)) {
            reject(new Error('Stock price service returned an invalid price'));
            return;
          }
          resolve(quote.latestPrice);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function getLikes(stock) {
  return likedByStock.has(stock) ? likedByStock.get(stock).size : 0;
}

function likeStock(stock, ipHash) {
  if (!likedByStock.has(stock)) {
    likedByStock.set(stock, new Set());
  }
  likedByStock.get(stock).add(ipHash);
}

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const requestedStocks = Array.isArray(req.query.stock)
        ? req.query.stock
        : [req.query.stock];
      const stocks = requestedStocks
        .filter(stock => typeof stock === 'string')
        .map(stock => stock.trim().toUpperCase());

      if (stocks.length !== requestedStocks.length || stocks.some(stock => !stock) || stocks.length < 1 || stocks.length > 2) {
        res.status(400).json({ error: 'Provide one or two stock symbols.' });
        return;
      }

      try {
        const prices = await Promise.all(stocks.map(getStockQuote));
        if (req.query.like === 'true') {
          const ipHash = crypto.createHash('sha256').update(req.ip).digest('hex');
          stocks.forEach(stock => likeStock(stock, ipHash));
        }

        if (stocks.length === 1) {
          res.json({
            stockData: {
              stock: stocks[0],
              price: prices[0],
              likes: getLikes(stocks[0])
            }
          });
          return;
        }

        const likes = stocks.map(getLikes);
        res.json({
          stockData: stocks.map((stock, index) => ({
            stock,
            price: prices[index],
            rel_likes: likes[index] - likes[1 - index]
          }))
        });
      } catch (error) {
        console.error('Stock price request failed:', error.message);
        res.status(502).json({ error: 'Unable to retrieve stock prices.' });
      }
    });
};
