// Minimal .docx text extraction. A .docx file is a zip archive; the visible
// text lives in word/document.xml as a series of <w:t>...</w:t> runs.
// We avoid a heavyweight docx-parsing dependency and just unzip + regex the
// text nodes out, which is more than enough for resume text extraction.

import { Buffer } from "buffer";

// Tiny local ZIP central-directory reader (no external dependency).
// Supports the "stored" (0) and "deflate" (8) compression methods, which
// covers every .docx produced by Word/Google Docs/LibreOffice.
async function readZipEntry(buffer, entryName) {
  const zlib = await import("zlib");

  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Not a valid DOCX/ZIP file.");

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);

  let offset = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .slice(offset + 46, offset + 46 + fileNameLength)
      .toString("utf-8");

    if (fileName === entryName) {
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart =
        localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) return compressedData;
      if (compressionMethod === 8) return zlib.inflateRawSync(compressedData);
      throw new Error("Unsupported DOCX compression method.");
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`Entry ${entryName} not found in DOCX.`);
}

export async function extractDocxText(buffer) {
  const xmlBuffer = await readZipEntry(buffer, "word/document.xml");
  const xml = xmlBuffer.toString("utf-8");

  // Grab every <w:t ...>text</w:t> run, decode basic XML entities, and join
  // paragraphs with newlines using </w:p> as the paragraph boundary.
  const withParagraphBreaks = xml.replace(/<\/w:p>/g, "\n");
  const matches = [...withParagraphBreaks.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];

  const decode = (s) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

  return matches.map((m) => decode(m[1])).join("").trim();
}
