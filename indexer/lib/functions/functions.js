const natural = require('natural');
const { TokenizerAr } = require('@nlpjs/lang-ar');

const tokenizer = new TokenizerAr();
const englishTokenizer = new natural.WordTokenizer();


function smartTokenize(text) {
    if (!text || typeof text !== 'string') return [];
  
    if (isArabic(text)) {
      return tokenizer.tokenize('مرحبًا بكم في عالم البرمجة');
    } else {
      return englishTokenizer.tokenize(text);
    }
  }
  
  module.exports = {
    smartTokenize
  }