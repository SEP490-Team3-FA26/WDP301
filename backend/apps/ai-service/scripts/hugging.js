require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

async function main() {
  const { InferenceClient } = await import("@huggingface/inference");

  if (!process.env.HF_TOKEN) {
    throw new Error("Missing HF_TOKEN in backend/.env");
  }

  const client = new InferenceClient(process.env.HF_TOKEN);
  let out = "";

  const stream = client.chatCompletionStream({
    model: "thinkingmachines/Inkling:together",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this image in one sentence.",
          },
          {
            type: "image_url",
            image_url: {
              url: "https://cdn.britannica.com/61/93061-050-99147DCE/Statue-of-Liberty-Island-New-York-Bay.jpg",
            },
          },
        ],
      },
    ],
  });

  for await (const chunk of stream) {
    const newContent = chunk.choices?.[0]?.delta?.content ?? "";
    out += newContent;
    process.stdout.write(newContent);
  }

  process.stdout.write("\n\n--- FULL RESPONSE ---\n");
  process.stdout.write(out.trim() + "\n");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
