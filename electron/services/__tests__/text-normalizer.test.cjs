"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeMathText, normalizeMarkdownForDisplay } = require("../text-normalizer.cjs");

test("normalizeMathText converte simbolos LaTeX inline comuns para texto legivel", () => {
  assert.equal(normalizeMathText("A ($\\cap$) B e x ($-$) y"), "A (∩) B e x (-) y");
  assert.equal(normalizeMathText("$\\alpha$ + $\\beta$ = $\\gamma$"), "α + β = γ");
});

test("normalizeMarkdownForDisplay preserva blocos de codigo cercados", () => {
  const source = [
    "Texto com $\\cap$ normalizado.",
    "",
    "```js",
    "const raw = \"$\\cap$\";",
    "```",
    "",
    "Depois $\\leq$ funciona."
  ].join("\n");

  const normalized = normalizeMarkdownForDisplay(source);

  assert.match(normalized, /Texto com ∩ normalizado\./);
  assert.match(normalized, /const raw = "\$\\cap\$";/);
  assert.match(normalized, /Depois ≤ funciona\./);
});
