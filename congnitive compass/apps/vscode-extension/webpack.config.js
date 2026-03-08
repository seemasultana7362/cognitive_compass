const path = require("path");

const extensionConfig = {
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  mode: process.env.NODE_ENV || "production",
  devtool: "source-map",
};

const webviewConfig = {
  target: "web",
  entry: "./src/webviews/3d-visualization/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "webview.js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  mode: process.env.NODE_ENV || "production",
};

module.exports = [extensionConfig, webviewConfig];
