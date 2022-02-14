const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const ProvidePlugin = require('webpack/lib/ProvidePlugin')

module.exports = (config) => {
  // Workaround to import typescript from the API side
  // https://github.com/redwoodjs/redwood/issues/531#issuecomment-848608430
  config.module.rules.forEach((rule) => {
    ;(rule.oneOf || []).forEach((oneOfRule) => {
      if (Array.isArray(oneOfRule.use)) {
        oneOfRule.use
          .filter((use) => use.loader === 'babel-loader')
          .forEach((use) => {
            applyBabelLoaderConfig(use.options) // found babel loader? apply code below
          })
      }
    })
  })
  function applyBabelLoaderConfig(options) {
    options.babelrcRoots = ['.', '../api']
  }

  // Automatically generate Favicon files
  config.plugins.push(
    new FaviconsWebpackPlugin({
      logo: './src/logo.svg',
      favicons: {
        appName: 'Zorro',
        icons: {
          appleIcon: false,
          appleStartup: false,
          windows: false,
          yandex: false,
          favicons: true,
          coast: false,
        },
      },
    })
  )
  config.plugins.push(
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  )

  // Polyfill for Buffer. Used by WalletConnect
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/748
  config.resolve.fallback = {
    ...config.resolve.fallback,
    buffer: require.resolve('buffer/'),
  }
  return config
}
