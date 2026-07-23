require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

async function main() {
  const fs = require("fs");
  const { InferenceClient } = await import("@huggingface/inference");

  const imagePath =
    process.argv[2] || "backend/apps/ai-service/static/dataSamplePresition/mock_rx_01_respiratory.png";
  const imageBase64 = fs.readFileSync(imagePath).toString("base64");
  const client = new InferenceClient(process.env.HF_TOKEN);
  let out = "";

  const stream = client.chatCompletionStream({
    model: process.env.HF_OCR_MODEL || "thinkingmachines/Inkling:together",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this prescription image and return the visible text as markdown.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || "";
    out += text;
    process.stdout.write(text);
  }
  console.log("\n---LEN---", out.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
