
function isArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
}

module.exports = {
    isArabic
}