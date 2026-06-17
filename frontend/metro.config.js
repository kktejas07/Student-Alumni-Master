// metro.config.js
// Polyfill Array.prototype.toReversed for Node <20 (used by metro-config internally)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Redirect .node.mjs → .js for @lexical/* packages so Metro does not
// try to minify ESM-only entry-points that its transformer cannot handle.
// Also redirect 'qrcode' to browser version to bypass Node-only pngjs during SSR.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'qrcode') {
    return {
      filePath: path.join(__dirname, 'node_modules/qrcode/lib/browser.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'lucide-react-native') {
    return {
      filePath: path.join(__dirname, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'),
      type: 'sourceFile',
    };
  }
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (resolved?.filePath?.endsWith('.node.mjs')) {
    return { filePath: resolved.filePath.replace('.node.mjs', '.js'), type: 'sourceFile' };
  }
  return resolved;
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
