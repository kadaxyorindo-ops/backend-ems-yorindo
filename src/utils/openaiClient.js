const OpenAI = require("openai");

const client = new OpenAI({
  baseURL: "https://mlapi.run/daef5150-72ef-48ff-8861-df80052ea7ac/v1/chat/completions",
  apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzU1NDk1ODEsIm5iZiI6MTc3NTU0OTU4MSwia2V5X2lkIjoiZTE4NTU1NDEtOTM4My00NjFiLWE3MzYtOTM5ODVkN2QzZTcyIn0.oCf81-qyT5KMucwI6xCcJPWCXe2n9-v_uBs56TNAo6s",
});

async function runChat() {
  try {
    const response = await client.chat.completions.create({
      // 1. Double check if "openai/gpt-5-nano" is supported by your provider
      // 2. If it still fails, try "gpt-4o-mini"
      model: "openai/gpt-5-nano",
      messages: [
        { role: "system", content: "Kamu adalah AI yang pintar IT" },
        { role: "user", content: "jelaskan konsep asynchronous" }
      ],
      temperature: 0.7,
    });

    console.log(response.choices[0].message.content);
  } catch (error) {
    // This catches network issues or API errors (400, 401, 404, etc.)
    console.error("Error Status:", error.status);
    console.error("Error Message:", error.message);
  }
}

runChat();