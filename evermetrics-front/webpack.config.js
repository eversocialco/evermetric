module.exports = {
  entry: './src/index.js',
  output: {
    path: `${__dirname}/public`,
    filename: 'app.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
      }
    ]
  }
}