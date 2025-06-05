// utils/functions.js
import chatConfig from "../config/chatConfig";

// Helper pentru timeout global
const DEFAULT_TIMEOUT = chatConfig.products.defaultTimeout;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAllWords(text, terms) {
  text = normalizeText(text || "");
  return terms.every(t => {
    if (!t) return false;
    const regex = new RegExp(`\\b${t}\\b`, 'i');
    return regex.test(text);
  });
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchAllProducts() {
  try {
    const resp = await fetchWithTimeout(chatConfig.products.endpoint);
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

function formatProduct(p) {
  const price = parseFloat(p.price).toFixed(2);
  let desc = stripHtml(p.description);
  const sentences = desc.match(/[^\.!\?]+[\.!\?]+/g) || [];
  desc = sentences.slice(0, 3).join(" ").trim();
  const brandArr = Array.isArray(p.attributes?.pa_brand) ? p.attributes.pa_brand : [];
  const brand = brandArr.length ? brandArr.join(", ") : "";
  return {
    name:        p.name,
    permalink:   p.permalink,
    price,
    description: desc,
    categories:  (p.categories && p.categories.join(", ")) || "",
    image:       (p.images && p.images[0]) || "",
    brand
  };
}

export async function getProducts({ query }) {
  const all = await fetchAllProducts();
  const terms = normalizeText(query).split(" ").filter(Boolean);

  // 1. Potrivire în `name`
  const nameMatches = all.filter(p => matchAllWords(p.name, terms));

  // 2. Potrivire în `description` + `short_description`
  const descMatches = all.filter(p => {
    const desc = normalizeText(
      stripHtml(p.description || "") +
      " " +
      stripHtml(p.short_description || "")
    );
    return matchAllWords(desc, terms);
  });

  // 3. Combinare fără duplicate (după `id`)
  const combined = [
    ...nameMatches,
    ...descMatches.filter(d => !nameMatches.some(n => n.id === d.id))
  ];

  // 4. Returnează primele N produse formatate dacă ai găsit rezultate
  if (combined.length > 0)
    return combined.slice(0, chatConfig.products.resultLimit).map(formatProduct);

  // 5. Fallback fuzzy: sinonime + substring
  const SIMILAR_WORDS = chatConfig.products.similarWords;
  let expandedTerms = [];
  for (const t of terms) {
    expandedTerms.push(t);
    if (SIMILAR_WORDS[t]) expandedTerms.push(...SIMILAR_WORDS[t]);
  }
  expandedTerms = [...new Set(expandedTerms)];

  const fuzzyMatches = all.filter(p => {
    const name = normalizeText(p.name || "");
    const desc = normalizeText(
      stripHtml(p.description || "") +
      " " +
      stripHtml(p.short_description || "")
    );
    return expandedTerms.some(t => {
      if (t.length < 4) return false;
      const regex = new RegExp(`${t}`, 'i');
      return regex.test(name) || regex.test(desc);
    });
  });

  if (fuzzyMatches.length > 0) {
    const fuzzyResults = fuzzyMatches.slice(0, chatConfig.products.resultLimit).map(formatProduct);
    fuzzyResults.isFuzzy = true;
    return fuzzyResults;
  }

  return [];
}
