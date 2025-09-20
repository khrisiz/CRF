import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function nsfw(text) {
  const response = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: text,
  });

  const categories = response.results[0].categories;
  return categories.sexual_explicit || false;
}

// Example usage
nsfw("some text here").then(console.log);
