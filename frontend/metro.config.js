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

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.useWatchman = false;

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

