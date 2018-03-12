const merge = require('webpack-merge');
const common = require('./webpack.common.config.js');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './',
        historyApiFallback: true,
        proxy: {
            '/api/*': {
                target: 'http://localhost:5000/',
                secure: false,
            },
            '/socket.io': {
                target: 'http://localhost:5000/',
                secure: false,
            },
        }
    },
});
