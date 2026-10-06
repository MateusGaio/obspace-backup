"use strict";

const INLINE_LATEX_SYMBOLS = new Map([
  ["\\cap", "∩"],
  ["\\cup", "∪"],
  ["\\in", "∈"],
  ["\\notin", "∉"],
  ["\\subset", "⊂"],
  ["\\subseteq", "⊆"],
  ["\\supset", "⊃"],
  ["\\supseteq", "⊇"],
  ["\\emptyset", "∅"],
  ["\\leq", "≤"],
  ["\\le", "≤"],
  ["\\geq", "≥"],
  ["\\ge", "≥"],
  ["\\neq", "≠"],
  ["\\ne", "≠"],
  ["\\approx", "≈"],
  ["\\times", "×"],
  ["\\cdot", "·"],
  ["\\pm", "±"],
  ["\\to", "→"],
  ["\\rightarrow", "→"],
  ["\\leftarrow", "←"],
  ["\\Rightarrow", "⇒"],
  ["\\iff", "⇔"],
  ["\\forall", "∀"],
  ["\\exists", "∃"],
  ["\\neg", "¬"],
  ["\\land", "∧"],
  ["\\lor", "∨"],
  ["\\alpha", "α"],
  ["\\beta", "β"],
  ["\\gamma", "γ"],
  ["\\delta", "δ"],
  ["\\epsilon", "ε"],
  ["\\theta", "θ"],
  ["\\lambda", "λ"],
  ["\\mu", "μ"],
  ["\\pi", "π"],
  ["\\sigma", "σ"],
  ["\\phi", "φ"],
  ["\\omega", "ω"],
  ["-", "-"]
]);

function normalizeMathExpression(expression) {
  const value = String(expression || "").trim();
  if (INLINE_LATEX_SYMBOLS.has(value)) {
    return INLINE_LATEX_SYMBOLS.get(value);
  }
  return value
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMathText(text) {
  return String(text || "").replace(/\$([^$\n]+)\$/g, (_match, expression) => normalizeMathExpression(expression));
}

function normalizeMarkdownForDisplay(markdown) {
  const source = String(markdown || "");
  const chunks = source.split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk) => (chunk.startsWith("```") ? chunk : normalizeMathText(chunk)))
    .join("");
}

module.exports = {
  normalizeMathText,
  normalizeMarkdownForDisplay
};
