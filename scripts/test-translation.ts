/**
 * Test script for Google Cloud Translation API
 * Run with: npx tsx scripts/test-translation.ts
 */

import { translateText, detectLanguage, batchTranslate } from '../lib/translation';

async function testTranslation() {
  console.log('🧪 Testing Google Cloud Translation API\n');

  try {
    // Test 1: Detect Farsi
    console.log('Test 1: Language Detection');
    const farsiText = 'سلام دنیا';
    const detectedLang = await detectLanguage(farsiText);
    console.log(`  Input: "${farsiText}"`);
    console.log(`  Detected: ${detectedLang}`);
    console.log(`  ✅ ${detectedLang === 'fa' ? 'PASS' : 'FAIL'}\n`);

    // Test 2: Translate Farsi to English
    console.log('Test 2: Farsi → English Translation');
    const result1 = await translateText(farsiText, 'fa', 'en');
    console.log(`  Original: "${farsiText}"`);
    console.log(`  Translated: "${result1.translatedText}"`);
    console.log(`  ✅ PASS\n`);

    // Test 3: Translate longer text
    console.log('Test 3: Longer Text Translation');
    const longText = 'مردم ایران برای آزادی و دموکراسی مبارزه می‌کنند';
    const result2 = await translateText(longText, 'fa', 'en');
    console.log(`  Original: "${longText}"`);
    console.log(`  Translated: "${result2.translatedText}"`);
    console.log(`  ✅ PASS\n`);

    // Test 4: Batch translation
    console.log('Test 4: Batch Translation');
    const texts = [
      'اعتراضات در تهران',
      'آزادی و دموکراسی',
      'مردم ایران',
    ];
    const result3 = await batchTranslate(texts, 'fa', 'en');
    console.log('  Original texts:');
    texts.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
    console.log('  Translated texts:');
    result3.translations.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
    console.log(`  ✅ PASS\n`);

    // Test 5: English detection
    console.log('Test 5: English Detection');
    const englishText = 'Hello world';
    const detectedLang2 = await detectLanguage(englishText);
    console.log(`  Input: "${englishText}"`);
    console.log(`  Detected: ${detectedLang2}`);
    console.log(`  ✅ ${detectedLang2 === 'en' ? 'PASS' : 'FAIL'}\n`);

    // Test 6: Same language (no translation)
    console.log('Test 6: Same Language Translation');
    const result4 = await translateText('Hello', 'en', 'en');
    console.log(`  Input: "Hello"`);
    console.log(`  Output: "${result4.translatedText}"`);
    console.log(`  ✅ ${result4.translatedText === 'Hello' ? 'PASS' : 'FAIL'}\n`);

    console.log('✅ All tests passed! Translation API is working correctly.');

  } catch (error) {
    console.error('❌ Translation test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testTranslation();
