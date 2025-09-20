import OpenAI from "openai";

// Initialize OpenAI with your API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
