const merge = require('webpack-merge');
const common = require('./webpack.common.config.js');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new UglifyJsPlugin(),
    ],
});
