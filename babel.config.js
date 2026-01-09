module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@core': './src/core',
          '@data': './src/data',
          '@infrastructure': './src/infrastructure',
          '@presentation': './src/presentation',
          '@store': './src/store',
        },
      },
    ],
  ],
};
