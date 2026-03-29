import axios from 'axios';

const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translate text using MyMemory Translation API
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code (e.g., 'en', 'uk')
 * @param {string} targetLang - Target language code (e.g., 'en', 'uk')
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, sourceLang, targetLang) {
  try {
    if (!text || !text.trim()) {
      return text;
    }

    const response = await axios.get(MYMEMORY_API_URL, {
      params: {
        q: text,
        langpair: `${sourceLang}|${targetLang}`,
      },
    });

    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      return response.data.responseData.translatedText;
    }

    // Fallback to original text if translation fails
    console.warn('Translation failed, returning original text');
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text on error
    return text;
  }
}

/**
 * Translate English text to Ukrainian
 * @param {string} text - English text to translate
 * @returns {Promise<string>} - Ukrainian translation
 */
export async function translateEnglishToUkrainian(text) {
  return translateText(text, 'en', 'uk');
}

/**
 * Translate Ukrainian text to English
 * @param {string} text - Ukrainian text to translate
 * @returns {Promise<string>} - English translation
 */
export async function translateUkrainianToEnglish(text) {
  return translateText(text, 'uk', 'en');
}
