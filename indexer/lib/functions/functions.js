const natural = require('natural');
const { TokenizerAr, NormalizerAr } = require('@nlpjs/lang-ar');
const { removeStopwords } = require('stopword');

const tokenizerAr = new TokenizerAr();
const normalizerAr = new NormalizerAr();
const englishTokenizer = new natural.WordTokenizer();

// Arabic stopwords
const arabicStopwords = [
  'في', 'من', 'على', 'و', 'أن', 'عن', 'إلى', 'ما', 'لا', 'هذا', 'هو', 'هي', 'كان', 'كل', 'لم', 'قد', 'ذلك', 'إن'
];

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function cleanTokens(tokens, lang = 'en') {
  return tokens
    .map(token => token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')) // remove punctuation, lowercase
    .filter(token => token.length > 1 && !/^\d+$/.test(token)) // remove digits and 1-char tokens
    .filter(token => {
      if (lang === 'ar') return !arabicStopwords.includes(token);
      
      // English filtered separately
      return true; 
    });
}

function smartTokenize(text) {
  if (!text || typeof text !== 'string') return [];

  if (isArabic(text)) {
    const normalized = normalizerAr.normalize(text);
    const tokens = tokenizerAr.tokenize(normalized);
    return cleanTokens(tokens, 'ar');
  } else {
    const tokens = englishTokenizer.tokenize(text);
    
    // built-in English stopwords
    const filtered = removeStopwords(tokens); 
    return cleanTokens(filtered, 'en');
  }
}

module.exports = {
  smartTokenize
};
