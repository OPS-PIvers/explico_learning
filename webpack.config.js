import GasPlugin from 'gas-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlInlineScriptPlugin from 'html-inline-script-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    // Client-side entries for React apps
    'main-app': './src/client/main-app.tsx',
    'editor-template': './src/client/editor-template.tsx',
    // Server-side entry for Google Apps Script
    'Code': './src/server/Code.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  optimization: {
    minimize: false, // Disable minification for clean GAS code
    splitChunks: {
      chunks: (chunk) => {
        // Never split the Code chunk for Google Apps Script
        return chunk.name !== 'Code';
      }
    }
  },
  node: {
    // Keep global for gas-webpack-plugin, disable others for GAS compatibility
    global: true,
    __filename: false,
    __dirname: false
  },
  // Disable problematic features for Google Apps Script
  devtool: false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    // GAS Plugin for server-side TypeScript compilation
    new GasPlugin({
      include: ['Code'],
      autoGlobalExportsFiles: [
        path.resolve(__dirname, 'src/server/Code.ts')
      ],
      comment: false
    }),
new HtmlWebpackPlugin({
      template: './src/templates/main-app.html',
      filename: 'main-app.html',
      chunks: ['main-app'],
      inject: 'body',
      // Inline the JavaScript for Google Apps Script compatibility
      inlineSource: '.(js|css)$'
    }),
    new HtmlWebpackPlugin({
      template: './src/templates/editor-template.html',
      filename: 'editor-template.html',
      chunks: ['editor-template'],
      inject: 'body',
      // Inline the JavaScript for Google Apps Script compatibility
      inlineSource: '.(js|css)$'
    }),
    new HtmlInlineScriptPlugin({
      // Inline all script tags
      htmlMatchPattern: [/main-app\.html$/, /editor-template\.html$/]
    })
  ]
};