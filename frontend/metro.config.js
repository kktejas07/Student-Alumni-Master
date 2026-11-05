// metro.config.js
// Polyfill Array.prototype.toReversed for Node <20 (used by metro-config internally)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const http = require('http');
const https = require('https');
const { FileStore } = require('metro-cache');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.useWatchman = false;

const defaultEnhanceMiddleware = config.server.enhanceMiddleware;
const backendOrigin = process.env.SA_BACKEND_URL || 'http://127.0.0.1:8001';
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const metroMiddleware = defaultEnhanceMiddleware(middleware, metroServer);
  return (req, res, next) => {
    let pathname;
    try {
      pathname = new URL(req.url || '/', 'http://localhost').pathname;
    } catch {
      return metroMiddleware(req, res, next);
    }

    if (pathname !== '/api' && !pathname.startsWith('/api/') && !pathname.startsWith('/uploads/')) {
      return metroMiddleware(req, res, next);
    }

    const target = new URL(req.url || '/', backendOrigin);
    const transport = target.protocol === 'https:' ? https : http;
    const proxyRequest = transport.request(target, {
      method: req.method,
      headers: { ...req.headers, host: target.host },
    }, (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    });

    proxyRequest.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ detail: 'Backend unavailable' }));
    });
    req.pipe(proxyRequest);
  };
};

// Stable on-disk cache store inside the project directory
const root = process.env.METRO_CACHE_ROOT || path.join(projectRoot, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Direct module aliases via extraNodeModules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'qrcode': require.resolve('qrcode/lib/browser.js'),
  'lucide-react': path.join(projectRoot, 'node_modules', 'lucide-react', 'dist', 'cjs', 'lucide-react.js'),
  'jspdf/dist/jspdf.es.min.js': require.resolve('jspdf/dist/jspdf.es.min.js'),
  'lucide-react-native': path.join(projectRoot, 'src', 'shims', 'lucide-react-native.js'),
};

const emptyAssetPath = path.join(projectRoot, 'assets', 'empty-asset.png');

// Custom resolver with non-recursive fallback
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (config.resolver.extraNodeModules[moduleName]) {
    return {
      filePath: config.resolver.extraNodeModules[moduleName],
      type: 'sourceFile',
    };
  }

  try {
    const resolved = context.resolveRequest(context, moduleName, platform);
    if (resolved?.filePath?.endsWith('.node.mjs')) {
      return { filePath: resolved.filePath.replace('.node.mjs', '.js'), type: 'sourceFile' };
    }
    return resolved;
  } catch (err) {
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(moduleName)) {
      return { filePath: emptyAssetPath, type: 'sourceFile' };
    }
    throw err;
  }
};

module.exports = config;

