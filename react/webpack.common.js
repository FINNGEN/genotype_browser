var webpack = require('webpack')

module.exports = {
    entry: [
        "./index.js"
    ],
    output: {
        path: __dirname + '/../static',
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.js?$/,
                loader: 'babel-loader',
		// use: ['style-loader', 'css-loader'],
                options: {
                    presets: [
            			['@babel/preset-env',
            			 {
            			     targets: {
            				 esmodules: true,
            			     }
            			 }],
            			'@babel/preset-react'
            		    ]
                },
                exclude: /node_modules/
            },
            { 
              test: /\.css$/, 
              use: ['style-loader', 'css-loader']
            },
            { 
              test: /\.js?$/,
              enforce: "pre", 
              exclude: /node_modules/,
              use: ['source-map-loader']
            },
            { 
              test: /\.jsx?$/,
              exclude: /node_modules/,
              loader: 'babel-loader',
              options: { presets: ['@babel/env','@babel/preset-react'] }
            },
            {
            test: /\.(png|jpe?g|gif)$/i,
            use: [
                {
                loader: 'file-loader',
                },
            ],
            },
            {
            test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
            use: [
                {
                loader: 'file-loader',
                options: {
                    name: './font/[hash].[ext]'
                }
                }
            ]
              }
        ] 
    },
    plugins: [
    ]
}