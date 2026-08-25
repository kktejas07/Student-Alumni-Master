module.exports = function (api) {
  api.cache(true);
  const presets = ['babel-preset-expo'];
  try {
    require.resolve('nativewind/babel');
    presets.push('nativewind/babel');
  } catch (e) {
    // fallback if nativewind/babel is not installed
  }
  return {
    presets,
  };
};
