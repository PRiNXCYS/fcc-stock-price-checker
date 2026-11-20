const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  function getStockPrices(query, callback) {
    chai.request(server)
      .get('/api/stock-prices')
      .query(query)
      .end(callback);
  }

  test('Viewing one stock returns its price and likes', function(done) {
    getStockPrices({ stock: 'GOOG' }, function(err, res) {
      assert.isNull(err);
      assert.equal(res.status, 200);
      assert.equal(res.body.stockData.stock, 'GOOG');
      assert.isNumber(res.body.stockData.price);
      assert.isNumber(res.body.stockData.likes);
      done();
    });
  });

  test('Liking one stock adds a like', function(done) {
    getStockPrices({ stock: 'GOOG' }, function(err, initialRes) {
      assert.isNull(err);
      getStockPrices({ stock: 'GOOG', like: 'true' }, function(likeErr, likeRes) {
        assert.isNull(likeErr);
        assert.equal(likeRes.status, 200);
        assert.equal(likeRes.body.stockData.likes, initialRes.body.stockData.likes + 1);
        done();
      });
    });
  });

  test('Liking the same stock twice from one IP adds only one like', function(done) {
    getStockPrices({ stock: 'GOOG', like: 'true' }, function(err, firstRes) {
      assert.isNull(err);
      getStockPrices({ stock: 'GOOG', like: 'true' }, function(repeatErr, repeatRes) {
        assert.isNull(repeatErr);
        assert.equal(repeatRes.body.stockData.likes, firstRes.body.stockData.likes);
        done();
      });
    });
  });

  test('Viewing two stocks returns relative likes', function(done) {
    getStockPrices({ stock: ['GOOG', 'AMZN'] }, function(err, res) {
      assert.isNull(err);
      assert.equal(res.status, 200);
      assert.isArray(res.body.stockData);
      assert.lengthOf(res.body.stockData, 2);
      assert.equal(res.body.stockData[0].stock, 'GOOG');
      assert.equal(res.body.stockData[1].stock, 'AMZN');
      assert.isNumber(res.body.stockData[0].price);
      assert.isNumber(res.body.stockData[1].price);
      assert.equal(res.body.stockData[0].rel_likes, -res.body.stockData[1].rel_likes);
      done();
    });
  });

  test('Liking two stocks returns stable relative likes for the same IP', function(done) {
    getStockPrices({ stock: ['GOOG', 'AMZN'], like: 'true' }, function(err, firstRes) {
      assert.isNull(err);
      assert.isArray(firstRes.body.stockData);
      getStockPrices({ stock: ['GOOG', 'AMZN'], like: 'true' }, function(repeatErr, repeatRes) {
        assert.isNull(repeatErr);
        assert.equal(repeatRes.body.stockData[0].rel_likes, firstRes.body.stockData[0].rel_likes);
        assert.equal(repeatRes.body.stockData[1].rel_likes, firstRes.body.stockData[1].rel_likes);
        done();
      });
    });
  });
});
