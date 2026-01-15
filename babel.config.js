module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./app/src'],
          alias: {
            '@': './',
            '@core': './app/src/core',
            '@data': './app/src/data',
            '@infrastructure': './app/src/infrastructure',
            '@presentation': './app/src/presentation',
            '@store': './app/src/store',
            '@shared': './app/src/shared',
          },
        },
      ],
    ],
  };
};
