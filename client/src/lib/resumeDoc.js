// Turns the AI's "resume" block into real downloadable files (.docx / .pdf).
//
// The chat model is told to write resumes in a deliberately simple format:
//   # Full Name
//   email | phone | city | links
//   ## SECTION NAME
//   **Role or Project** | Company or Tech | Dates
//   - bullet point
// This module parses that into blocks and renders them. Anything the model
// writes that doesn't match a rule is kept as a plain paragraph, so a
// slightly off-format reply still produces a complete, readable document.

const FENCE_RE = /```(resume|markdown|md|text)?[ \t]*\n([\s\S]*?)```/gi;

/**
 * Splits an assistant message into ordered segments:
 *   { type: "text", text } or { type: "resume", text }
 * A fenced block counts as a resume when it's tagged ```resume, or when it's
 * an untagged/markdown/text block long enough to plausibly be a full
 * document (free models don't always use the exact tag).
 */
export function splitMessage(content) {
  const segments = [];
  let last = 0;
  let m;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(content)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    const body = m[2].trim();
    const looksLikeResume =
      lang === "resume" ||
      (body.length > 500 && /(^|\n)#{1,2}\s+\S/.test(body)) ||
      (body.length > 500 && /\b(experience|education|skills|projects)\b/i.test(body));
    if (!looksLikeResume) continue;
    if (m.index > last) segments.push({ type: "text", text: content.slice(last, m.index) });
    segments.push({ type: "resume", text: body });
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: "text", text: content.slice(last) });
  return segments.length ? segments : [{ type: "text", text: content }];
}

/** Splits "**bold** and plain" into [{text, bold}] runs. */
function inlineRuns(line) {
  const runs = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) runs.push({ text: line.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last), bold: false });
  return runs.length ? runs : [{ text: line, bold: false }];
}

const stripMd = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`/g, "");

/**
 * Parses resume text into blocks:
 *  name | contact | heading | bullet | line | space
 */
export function parseResume(text) {
  const blocks = [];
  let seenName = false;
  let expectContact = false;

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const t = line.trim();

    if (!t) {
      blocks.push({ type: "space" });
      continue;
    }
    if (/^#\s+/.test(t) && !seenName) {
      blocks.push({ type: "name", text: stripMd(t.replace(/^#\s+/, "")) });
      seenName = true;
      expectContact = true;
      continue;
    }
    if (/^#{2,3}\s+/.test(t)) {
      blocks.push({ type: "heading", text: stripMd(t.replace(/^#{2,3}\s+/, "")).toUpperCase() });
      expectContact = false;
      continue;
    }
    if (/^[-*•]\s+/.test(t)) {
      blocks.push({ type: "bullet", runs: inlineRuns(t.replace(/^[-*•]\s+/, "")) });
      expectContact = false;
      continue;
    }
    if (expectContact) {
      blocks.push({ type: "contact", text: stripMd(t) });
      expectContact = false;
      continue;
    }
    blocks.push({ type: "line", runs: inlineRuns(t) });
  }

  // Collapse repeated blank lines and trim leading/trailing ones.
  const out = [];
  for (const b of blocks) {
    if (b.type === "space" && (out.length === 0 || out[out.length - 1].type === "space")) continue;
    out.push(b);
  }
  while (out.length && out[out.length - 1].type === "space") out.pop();
  return out;
}

export function resumeTitle(text) {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? stripMd(m[1]).trim() : "Resume";
}

export function fileBaseName(text) {
  const name = resumeTitle(text)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${name || "Resume"}_Updated`;
}

/** Builds a .docx Blob. The docx library is loaded only when needed. */
export async function buildDocx(text) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    BorderStyle,
  } = await import("docx");

  const FONT = "Calibri";
  const blocks = parseResume(text);
  const children = [];

  for (const b of blocks) {
    switch (b.type) {
      case "name":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: b.text, bold: true, size: 36, font: FONT })],
          })
        );
        break;
      case "contact":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: b.text, size: 20, font: FONT, color: "444444" })],
          })
        );
        break;
      case "heading":
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "7C5CFF", space: 2 },
            },
            keepNext: true,
            children: [
              new TextRun({ text: b.text, bold: true, size: 24, font: FONT, color: "2B2B6B" }),
            ],
          })
        );
        break;
      case "bullet":
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: b.runs.map(
              (r) => new TextRun({ text: r.text, bold: r.bold, size: 21, font: FONT })
            ),
          })
        );
        break;
      case "line":
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            keepNext: true,
            children: b.runs.map(
              (r) => new TextRun({ text: r.text, bold: r.bold, size: 21, font: FONT })
            ),
          })
        );
        break;
      case "space":
        break; // spacing is handled per paragraph
    }
  }

  const doc = new Document({
    creator: "LevelUp",
    title: resumeTitle(text),
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

/** Builds a .pdf Blob with jsPDF (loaded only when needed). */
export async function buildPdf(text) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const maxW = pageW - M * 2;
  // `y` is always the TOP of the next line; text is drawn at y + size so
  // the baseline sits inside the line box.
  let y = M;

  const ensure = (h) => {
    if (y + h > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  // Draws bold/regular runs with word wrapping. Line breaks are decided
  // word by word, but each line is then drawn as whole phrases (one
  // text call per bold/regular stretch) so the PDF viewer spaces the words
  // with its own font metrics instead of relying on our per-word math.
  const drawRuns = (runs, x0, size, lineH, width) => {
    const tokens = [];
    for (const r of runs) {
      const parts = r.text.match(/\s*\S+\s*/g);
      if (!parts) continue;
      for (const w of parts) {
        tokens.push({
          word: w.trim(),
          lead: /^\s/.test(w),
          trail: /\s$/.test(w),
          bold: r.bold,
        });
      }
    }

    const measure = (str, bold) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      return doc.getTextWidth(str);
    };
    const spaceW = (bold) => measure("a a", bold) - measure("aa", bold);

    // 1) Break into lines of segments.
    const lines = [];
    let line = [];
    let lineW = 0;
    let prev = null;
    for (const tok of tokens) {
      const ww = measure(tok.word, tok.bold);
      const gap = prev && (prev.trail || tok.lead) ? spaceW(tok.bold) : 0;
      if (line.length && lineW + gap + ww > width) {
        lines.push(line);
        line = [];
        lineW = 0;
        prev = null;
      }
      const hasGap = !!(prev && (prev.trail || tok.lead));
      const lastSeg = line[line.length - 1];
      if (lastSeg && lastSeg.bold === tok.bold) {
        lastSeg.text += (hasGap ? " " : "") + tok.word;
      } else {
        line.push({ text: tok.word, bold: tok.bold, gapBefore: hasGap });
      }
      lineW += (line.length > 1 || lines.length >= 0 ? gap : 0) + ww;
      prev = tok;
    }
    if (line.length) lines.push(line);

    // 2) Draw each line.
    for (const segs of lines) {
      ensure(lineH);
      let x = x0;
      for (const seg of segs) {
        // Slightly generous gap where bold meets regular text: a viewer's
        // font can run a touch wider than jsPDF measures.
        if (seg.gapBefore) x += spaceW(seg.bold) * 1.35;
        doc.setFont("helvetica", seg.bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.text(seg.text, x, y + size);
        x += doc.getTextWidth(seg.text);
      }
      y += lineH;
    }
  };

  for (const b of parseResume(text)) {
    if (b.type === "name") {
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(b.text, pageW / 2, y + 20, { align: "center" });
      y += 28;
    } else if (b.type === "contact") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(80);
      for (const l of doc.splitTextToSize(b.text, maxW)) {
        ensure(13);
        doc.text(l, pageW / 2, y + 9.5, { align: "center" });
        y += 13;
      }
      doc.setTextColor(0);
      y += 4;
    } else if (b.type === "heading") {
      ensure(30);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(43, 43, 107);
      doc.text(b.text, M, y + 11.5);
      doc.setDrawColor(124, 92, 255);
      doc.setLineWidth(0.8);
      doc.line(M, y + 16, pageW - M, y + 16);
      doc.setTextColor(0);
      y += 24;
    } else if (b.type === "bullet") {
      ensure(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text("\u2022", M + 4, y + 10.5);
      drawRuns(b.runs, M + 16, 10.5, 13.5, maxW - 16);
      y += 1.5;
    } else if (b.type === "line") {
      ensure(16);
      y += 3;
      drawRuns(b.runs, M, 10.5, 13.5, maxW);
    } else if (b.type === "space") {
      y += 3;
    }
  }

  return doc.output("blob");
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
