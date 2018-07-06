import CopyWebpackPlugin from './copyWebpackPlugin';

let ImportComponent = CopyWebpackPlugin.bind(null, [], {});
ImportComponent['default'] = ImportComponent;
module.exports = ImportComponent;