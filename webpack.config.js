const path = require('path');
const copy = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        controller: './extension/controller.js',
        ldn: './extension/ldn.js',
        popup: './extension/popup.js',
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            { test: /\.mjs$/, include: /node_modules/, type: "javascript/auto" }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    devtool: 'source-map', // Add this line to enable source maps
    optimization: {
        minimize: false // Disable minification
    },
    plugins: [
        new copy([
            { from: 'extension/popup.html', to: 'popup.html' },
            { from: 'extension/manifest.json', to: 'manifest.json' },
            { from: 'extension/loader.js', to: 'loader.js' },
            { from: 'extension/styles', to: 'styles' },
            { from: 'extension/scripts', to: 'scripts' },
            { from: 'extension/assets', to: 'assets' }
        ])
    ]
};
