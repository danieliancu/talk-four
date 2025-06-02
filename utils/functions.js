// utils/functions.js
// Căutare produse: name → description → no result

const DEFAULT_TIMEOUT = 10000;

/** Fetch cu timeout și AbortController */
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

/** Normalizează text: lowercase, fără diacritice/punctuație */
function normalizeText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Potrivire pe cuvinte întregi */
function matchAllWords(text, terms) {
  text = normalizeText(text || "");
  return terms.every(t => {
    if (!t) return false;
    // Regex boundary match pentru fiecare termen
    const regex = new RegExp(`\\b${t}\\b`, 'i');
    return regex.test(text);
  });
}

/** Strip HTML simplu */
function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Încarcă toate produsele */
async function fetchAllProducts() {
  try {
    const resp = await fetchWithTimeout("https://natmag.ro/wp-json/custom/v1/products");
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

/** Formatează un produs individual */
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
    brand        // <-- aici ai valoarea brandului
  };
}

/**
 * Caută produse după query:
 * 1) în name (toți termenii, ca word boundary)
 * 2) în description (toți termenii, ca word boundary)
 * 3) combină rezultatele fără duplicate și returnează primele 5
 * 4) dacă nu găsește nimic, caută fuzzy cu sinonime + substring (universal)
 */
export async function getProducts({ query }) {
  const all = await fetchAllProducts();
  const terms = normalizeText(query).split(" ").filter(Boolean);

  // Debug pentru analiză
  console.log("🔍 Query terms:", terms);
  console.log("📦 Total products loaded:", all.length);

  // 1. Potrivire în `name` (word boundary)
  const nameMatches = all.filter(p => matchAllWords(p.name, terms));

  // 2. Potrivire în `description` + `short_description` (word boundary)
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

  console.log("✅ Matches found:", combined.length);

  // 4. Returnează primele 5 produse formatate dacă ai găsit rezultate
  if (combined.length > 0) return combined.slice(0, 5).map(formatProduct);

  // 5. Fallback fuzzy: sinonime + substring pentru orice termen
  const SIMILAR_WORDS = {
      'menstruatie': ['menstruala', 'menstruale', 'menstruație', 'menstruații', 'menstruală', 'menstrual', 'menstruatiei', 'menstruaţiei'],
      'brun': ['bruna', 'brune', 'bruni'],
      'germinare': ['germinat', 'germeni', 'germina', 'germinați'],
      'germinat': ['germinare', 'germeni', 'germina', 'germinați'],
      'suc': ['sucuri', 'bauturi racoritoare', 'sucuri', 'sucurile'],
      'confiat': ['confiate', 'confiată', 'confiati', 'confiata'],
      'confiate': ['confiat', 'confiată', 'confiati','confiata'],      
    // Adaugă aici sinonime pentru orice alt cuvânt-cheie relevant
  };

  let expandedTerms = [];
  for (const t of terms) {
    expandedTerms.push(t);
    // dacă există sinonime, adaugă-le
    if (SIMILAR_WORDS[t]) expandedTerms.push(...SIMILAR_WORDS[t]);
  }
  expandedTerms = [...new Set(expandedTerms)]; // fără duplicate

  // Căutare fuzzy: orice din variante ca substring, dar să fie la minim 4 caractere (evită cuvinte scurte generice)
  const fuzzyMatches = all.filter(p => {
    const name = normalizeText(p.name || "");
    const desc = normalizeText(
      stripHtml(p.description || "") +
      " " +
      stripHtml(p.short_description || "")
    );
    return expandedTerms.some(t => {
      if (t.length < 4) return false; // evită fals pozitive la cuvinte scurte
      const regex = new RegExp(`${t}`, 'i');
      return regex.test(name) || regex.test(desc);
    });
  });

  // Dacă ai găsit variante apropiate, marchează-le ca fuzzy
  if (fuzzyMatches.length > 0) {
    const fuzzyResults = fuzzyMatches.slice(0, 5).map(formatProduct);
    fuzzyResults.isFuzzy = true; // poți folosi flag-ul în UI!
    return fuzzyResults;
  }

  // Niciun rezultat – fallback clasic
  return [];
}
