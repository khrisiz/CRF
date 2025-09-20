import OpenAI from "openai";

// Initialize OpenAI with your API key
const openai = new OpenAI({ apiKey: process.env.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 });

/**
 * Check if a text is NSFW
 * @param {string} text - The text to analyze
 * @returns {Promise<boolean>} - true if NSFW, false if safe
 */
async function nsfw(text) {
  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const categories = response.results[0].categories;
    return categories.sexual_explicit || false;
  } catch (error) {
    console.error("Error checking NSFW:", error);
    return false;
  }
}

// Example usage
(async () => {
  const testText = "some text here";
  const isNSFW = await nsfw(testText);
  console.log(`NSFW: ${isNSFW}`);
})();
