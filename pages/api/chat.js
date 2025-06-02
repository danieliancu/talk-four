import OpenAI from "openai";
import chatConfig from "../../config/chatConfig";
import { getProducts } from "../../utils/functions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "'messages' should be an array" });
  }

  const convo = [
    { role: "system", content: chatConfig.ai.systemPrompt },
    ...messages
  ];

  try {
    const response = await openai.chat.completions.create({
      model: chatConfig.ai.model,
      messages: convo,
      functions: chatConfig.ai.functions,
      function_call: "auto"
    });

    const message = response.choices[0].message;

    if (!message.function_call) {
      const trimmed = (message.content || "").trim();
      const isFakeJson = trimmed.startsWith("[") && trimmed.endsWith("]");

      if (isFakeJson) {
        console.warn("⚠️ HALUCINARE: modelul a generat JSON fără function_call!");

        return res.status(200).json({
          message: {
            role: "assistant",
            content: "Îmi pare rău, nu am găsit produse relevante."
          },
          isProducts: false
        });
      }
    }

    // --- NOU: Explicație conversațională când returnezi produse ---
    if (message.function_call?.name === "getProducts") {
      const args = JSON.parse(message.function_call.arguments);
      const products = await getProducts(args);

      if (products.length === 0) {
        return res.status(200).json({
          message: {
            role: "assistant",
            content: "Nu am găsit acest produs."
          },
          isProducts: true
        });
      }

      // -- Prompt explanation --
      const userQuery = args.query || req.body.messages?.[req.body.messages.length-1]?.content || "";
      const productsShort = products.slice(0, 5);

      const productsList = productsShort
        .map((p, i) => `${i+1}. ${p.name}${p.description ? ' - ' + p.description : ''}`)
        .join('\n');

      const explanationPrompt = chatConfig.ai.explanationPrompt
        .replace("{query}", userQuery)
        .replace("{products}", productsList);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful shopping assistant." },
          { role: "user", content: explanationPrompt }
        ],
        max_tokens: 120,
        temperature: 0.8,
      });

      const explanation = completion.choices[0].message.content.trim();

      return res.status(200).json({
        message: {
          role: "assistant",
          content: JSON.stringify(products)
        },
        isProducts: true,
        explanation // <-- nou, pentru frontend
      });
    }

    // --- Link-uire automată a produselor și conversie linkuri Markdown în HTML ---
    let rawText = (message.content || "").trim();

    // Încarcă toate produsele (sau un cache, cum preferi)
    const allProducts = await getProducts({ query: "" }); // toate produsele

    // Sortează produsele după lungime descrescătoare (pentru a evita link-uri parțiale în denumiri)
    allProducts.sort((a, b) => b.name.length - a.name.length);

    // Înlocuiește orice apariție exactă (case-insensitive) a numelui unui produs cu link
    for (const product of allProducts) {
      const escapedName = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const reg = new RegExp(`\\b${escapedName}\\b`, "gi");
      rawText = rawText.replace(reg, `<a href="${product.permalink}" target="_blank">${product.name}</a>`);
    }

    // --- Convertim orice link Markdown în HTML ---
    rawText = rawText.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)\s]+)\)/g,
      '<a href="$2" target="_blank">$1</a>'
    );
    // --- END MODIFICARE ---

    return res.status(200).json({
      message: {
        role: "assistant",
        content: rawText
      },
      isProducts: false
    });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "OpenAI error" });
  }
}
