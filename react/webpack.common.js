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
                query: {
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
              loader: "style-loader!css-loader" 
            }
        ] 
    },
    plugins: [
    ]
}
