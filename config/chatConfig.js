// config/chatConfig.js
// Centralize all customizable settings for the chat assistant (exclusiv produse)

const chatConfig = {
  // API & produs settings (nou bloc!)
  products: {
    endpoint: "https://natmag.ro/wp-json/custom/v1/products",  // <-- aici schimbi endpoint-ul!
    similarWords: {
      'menstruatie': ['menstruala', 'menstruale', 'menstruație', 'menstruații', 'menstruală', 'menstrual', 'menstruatiei', 'menstruaţiei'],
      'brun': ['bruna', 'brune', 'bruni'],
      'germinare': ['germinat', 'germeni', 'germina', 'germinați'],
      'germinat': ['germinare', 'germeni', 'germina', 'germinați'],
      'suc': ['sucuri', 'bauturi racoritoare', 'sucuri', 'sucurile'],
      'confiat': ['confiate', 'confiată', 'confiati', 'confiata'],
      'confiate': ['confiat', 'confiată', 'confiati','confiata'],
      // ...continui după nevoie
    },
    resultLimit: 5, // <-- aici setezi cate produse sa apara (inclusiv la fuzzy)
    defaultTimeout: 10000 // pentru fetchWithTimeout
  },  
  // AI settings
  ai: {
    model: "gpt-3.5-turbo", // OpenAI model name
    explanationModel: "gpt-4o", // <-- ADĂUGAT
    systemPrompt: "You are a strict product assistant. For ANY user message that mentions a product, a brand, or a category, you MUST use the function getProducts. DO NOT reply with product lists yourself. You are not allowed to make assumptions or generate JSON unless returned by getProducts. Your only job is to call getProducts and return the raw array it provides. Always answer in Romanian.",

    // Prompt pentru explicație conversațională (adăugat)
    explanationPrompt: `
      User asked for: "{query}"
      Products found:
      {products}
      Write a very short explanation (no more than 2 sentences), friendly explanation for the user, relating these products to their query. Mention why these products match the user's request, and if they are alternatives, explain that too. DO NOT repeat the product list, only explanation! If user used Romanian, reply in Romanian.
      `.trim(),

      // --- Nou: setări pentru explicație ---
    explanation: {
      systemMessage: "You are a helpful shopping assistant.", // <-- aici!
      maxTokens: 120, // <-- aici!
      temperature: 0.8 // <-- aici!
    },    

    // Keyword extraction AI settings (pentru procesare avansată a query-ului)
    keywordExtraction: {
      enabled: true, // setează pe true dacă vrei să folosești AI extraction la fiecare query
      model: "gpt-4o", // poți folosi alt model dacă vrei
      prompt: "Extrage doar cuvintele cheie relevante pentru căutarea unui produs, din întrebarea de mai jos. Ignoră cuvintele generale. Răspunde doar cu lista JSON, fără alte explicații. Exemplu: 'ceva de folosire pentru probleme menstruale' => [\"menstruale\"]"
    },

    // Funcție exclusivă pentru căutare produse
    functions: [
      {
        name: "getProducts",
        description: "Caută produse în catalog după un termen dat",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Termenul după care căutăm numele produsului"
            }
          },
          required: ["query"]
        }
      }
    ]
  },

  // UI language and styling settings
  ui: {
    language: "ro",
    appTitle: "Natmag.ro Asistent | Prietenul tău",      // Title shown at top
    inputPlaceholder: "Caută produse...",   // Placeholder în câmpul de input
    sendButtonText: "Caută",                // Text pe butonul de trimitere
    labels: {
      user: "",
      assistant: "",
    },

     messages: {
      notFound: "Îmi pare rău, nu am găsit produse relevante.",
      notFoundSingle: "Nu am găsit acest produs."
    },

    // Product card template and styles
    productCard: {
      template: `
        <div style="{{containerStyle}}">
          <div style="{{leftStyle}}">
            <img src="{{image}}" style="{{imgStyle}}">
          </div>
          <div style="{{rightStyle}}">
            <strong style="{{categoryStyle}}">{{categories}}</strong>
            <strong style="{{categoryStyle}}">{{brand}}</strong>    
            <strong style="{{titleStyle}}">{{name}}</strong>
            <div style="{{descriptionStyle}}">{{description}}</div>
            <div style="{{footerStyle}}">
              <span style="{{priceStyle}}">Preț: {{price}} RON</span>
              <a href="{{permalink}}" target="_blank" style="{{buttonStyle}}">Vezi produsul</a>
            </div>
          </div>
        </div>`,
      styles: {
        containerStyle:   "padding: 20px;margin:15px 0;border-radius:10px;background:#fff;font-size:16px;box-shadow:0 2px 3px lightgrey;display: flex;flex-wrap: nowrap;gap: 20px;height: 200px;color: #333;",
        leftStyle:        "background: #e3f0fc;width: 40%;display: flex;align-items: center;justify-content: center;overflow:hidden;",
        imgStyle:         "width: auto;height:80%;mix-blend-mode: multiply;",
        rightStyle:       "width: 60%;",
        categoryStyle:    "background: #e3f0fc;color: #0070f3;font-weight: 700;text-transform: uppercase;font-size: 10px;padding: 3px 6px;margin-bottom: 10px;display: inline-block;border-radius: 5px;",
        titleStyle:       "font-size: 16px;margin-bottom:5px;display:block;",
        descriptionStyle: "font-size: 12px;margin: 5px 0;color: #333;display: -webkit-box;-webkit-line-clamp: 3;-webkit-box-orient: vertical;overflow: hidden;text-overflow: ellipsis;height: auto;max-height: calc(1.2em * 3);",
        footerStyle:      "margin-top: 10px;border-top: .1px solid black;padding-top: 10px;",
        priceStyle:       "font-weight:bold;display:block;font-size: 14px;margin-bottom: 5px;",
        buttonStyle:      "background: #0070f3;color: white;font-size: 12px;border-radius: 6px;padding: 3px 6px;text-decoration:none;display: inline-block;"
      }
    }
  }
};

export default chatConfig;
