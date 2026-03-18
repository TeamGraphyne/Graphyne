const fontList = require('font-list');
fontList.getFonts()
  .then(fonts => console.log('Found ' + fonts.length + ' fonts. First 5:', fonts.slice(0, 5)))
  .catch(console.error);
