var webpack = require('webpack');
var path = require('path');

var parentDir = path.join(__dirname, '../');

module.exports = {
    mode: 'development',
    entry: [
        path.join(parentDir, 'index.js')
    ],
    module: {
        rules: [{
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        },{
            test: /\.less$/,
            loaders: ['style-loader', 'css-loader', 'less-loader']
        },{
            test: /\.(gif|png|jpe?g|svg)$/,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        name: 'img/[name].[ext]',
                        publicPath: '/',
                    },
                },
                {
                    loader: 'image-webpack-loader',
                    options: {
                        bypassOnDebug: true,
                    },
                },
            ],
        }]
    },
    output: {
        path: parentDir + '/dist',
        filename: 'bundle.js',
    },
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
    }
}
