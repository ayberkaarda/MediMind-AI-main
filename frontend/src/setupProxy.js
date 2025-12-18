const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000', // Backend adresi
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Backend'e giderken /api kısmını sil
      },
    })
  );
};