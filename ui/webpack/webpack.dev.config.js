const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.config.js');

const parentDir = path.join(__dirname, '../');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: parentDir,
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
