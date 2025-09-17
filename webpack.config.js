import GasPlugin from 'gas-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    'Code': './src/server/Code.ts',
    'constants': './src/server/constants.ts',
    'main-app': './src/client/main-app.tsx',
    'editor-template': './src/client/editor-template.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
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
    new GasPlugin({
      // Specify server-side entry points
      include: ['Code', 'constants', '**/server/**']
    }),
    new HtmlWebpackPlugin({
      template: './src/templates/main-app.html',
      filename: 'main-app.html',
      chunks: ['main-app']
    }),
    new HtmlWebpackPlugin({
      template: './src/templates/editor-template.html',
      filename: 'editor-template.html',
      chunks: ['editor-template']
    })
  ]
};