"use strict";

const fs = require("fs/promises");
const path = require("path");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".xml", ".yaml", ".yml"]);

function extensionOf(filePath) {
  return path.extname(filePath || "").toLowerCase();
}

function normalizeAttachment(filePath) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    path: filePath,
    name: path.basename(filePath),
    extension: extensionOf(filePath)
  };
}

async function selectAttachmentFiles({ dialog, window }) {
  const result = await dialog.showOpenDialog(window, {
    title: "Anexar arquivos ao Obspace",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Documentos e imagens",
        extensions: ["pdf", "png", "jpg", "jpeg", "webp", "gif", "txt", "md", "docx", "pptx", "xlsx", "csv", "json"]
      },
      { name: "Todos os arquivos", extensions: ["*"] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths.map(normalizeAttachment);
}

async function readTextFile(filePath) {
  const buffer = await fs.readFile(filePath);
  for (const encoding of ["utf8", "latin1"]) {
    try {
      return buffer.toString(encoding);
    } catch {
      continue;
    }
  }
  return buffer.toString("utf8");
}

async function readPdf(filePath) {
  const pdf = require("pdf-parse");
  const data = await fs.readFile(filePath);
  const parsed = await pdf(data);
  return parsed.text || "";
}

async function readDocx(filePath) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

async function readXlsx(filePath) {
  const xlsx = require("xlsx");
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const chunks = [];
  for (const sheetName of workbook.SheetNames) {
    const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    chunks.push(`# Planilha: ${sheetName}\n${csv}`);
  }
  return chunks.join("\n\n");
}

function stripXml(value) {
  return String(value || "")
    .replace(/<a:t[^>]*>/g, "")
    .replace(/<\/a:t>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function readPptx(filePath) {
  const JSZip = require("jszip");
  const data = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(data);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const slides = [];
  for (const name of slideNames) {
    const xml = await zip.file(name).async("string");
    const text = stripXml(xml);
    if (text) {
      slides.push(`# ${path.basename(name, ".xml")}\n${text}`);
    }
  }
  return slides.join("\n\n");
}

async function readImage(filePath, extension) {
  const data = await fs.readFile(filePath);
  const mime =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : "image/png";
  return {
    text: `[Imagem anexada: ${path.basename(filePath)}. Use-a se o modelo selecionado suportar visao.]`,
    image: {
      mime,
      base64: data.toString("base64")
    }
  };
}

async function processSingleAttachment(input) {
  const filePath = input.path || input;
  const extension = extensionOf(filePath);
  const base = {
    id: input.id || filePath,
    path: filePath,
    name: input.name || path.basename(filePath),
    extension,
    text: "",
    image: null,
    error: null
  };

  try {
    if (IMAGE_EXTENSIONS.has(extension)) {
      return { ...base, ...(await readImage(filePath, extension)) };
    }
    if (extension === ".pdf") {
      return { ...base, text: await readPdf(filePath) };
    }
    if (extension === ".docx") {
      return { ...base, text: await readDocx(filePath) };
    }
    if (extension === ".xlsx") {
      return { ...base, text: await readXlsx(filePath) };
    }
    if (extension === ".pptx") {
      return { ...base, text: await readPptx(filePath) };
    }
    if (TEXT_EXTENSIONS.has(extension)) {
      return { ...base, text: await readTextFile(filePath) };
    }

    return { ...base, error: "Tipo de arquivo ainda nao suportado para extracao textual." };
  } catch (error) {
    return { ...base, error: String(error.message || error) };
  }
}

async function processAttachments(attachments) {
  const processed = await Promise.all((attachments || []).map(processSingleAttachment));
  return processed.map((item) => ({
    ...item,
    text: String(item.text || "").slice(0, 120000)
  }));
}

module.exports = {
  selectAttachmentFiles,
  processAttachments
};
