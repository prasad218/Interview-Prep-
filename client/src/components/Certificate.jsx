import { useState } from "react";

async function downloadCertificatePdf(certificate) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Outer border
  doc.setDrawColor(124, 92, 255);
  doc.setLineWidth(3);
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
  doc.setDrawColor(220, 214, 245);
  doc.setLineWidth(1);
  doc.rect(34, 34, pageWidth - 68, pageHeight - 68);

  const centerX = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(124, 92, 255);
  doc.text("INTERVIEW PREP", centerX, 90, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(140, 138, 150);
  doc.text("Certificate of Readiness", centerX, 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(30, 26, 45);
  doc.text(certificate.name, centerX, 165, { align: "center" });

  const trackLabel =
    certificate.mode === "company" && certificate.company
      ? `${certificate.company}-style ${certificate.role} assessment`
      : `${certificate.role} readiness assessment`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(70, 68, 84);
  doc.text(
    `has demonstrated readiness by scoring ${certificate.percent}% on the`,
    centerX,
    198,
    { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.text(trackLabel, centerX, 220, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(130, 128, 140);
  doc.text(
    `Issued ${new Date(certificate.issuedAt).toLocaleDateString()}   ·   Certificate ID: ${certificate.id}`,
    centerX,
    260,
    { align: "center" }
  );

  doc.setFontSize(9);
  doc.setTextColor(150, 148, 160);
  const disclaimer =
    certificate.mode === "company" && certificate.company
      ? `Issued by Interview Prep (Aakara.AI) based on independent practice-test performance. ` +
        `Not issued, endorsed by, or affiliated with ${certificate.company}.`
      : `Issued by Interview Prep (Aakara.AI) based on independent practice-test performance.`;
  const lines = doc.splitTextToSize(disclaimer, pageWidth - 160);
  doc.text(lines, centerX, pageHeight - 60, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(124, 92, 255);
  doc.text("Interview Prep · Aakara.AI", centerX, pageHeight - 40, { align: "center" });

  doc.save(`interview-prep-certificate-${certificate.id}.pdf`);
}

export default function Certificate({ certificate }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCertificatePdf(certificate);
    } finally {
      setDownloading(false);
    }
  };

  const trackLabel =
    certificate.mode === "company" && certificate.company
      ? `${certificate.company}-style ${certificate.role} assessment`
      : `${certificate.role} readiness assessment`;

  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-aurora p-6 sm:p-8 text-center relative overflow-hidden">
      <div className="absolute top-3 right-3 text-3xl">🏅</div>
      <p className="text-[11px] font-semibold tracking-widest text-accent-soft uppercase">
        Interview Prep
      </p>
      <p className="text-xs text-ink-500 mb-4">Certificate of Readiness</p>
      <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink-100">
        {certificate.name}
      </h2>
      <p className="text-sm text-ink-300 mt-2">
        scored <span className="text-signal-teal font-semibold">{certificate.percent}%</span> on the
      </p>
      <p className="text-sm font-semibold text-ink-100">{trackLabel}</p>
      <p className="text-[11px] text-ink-500 mt-3">
        Issued {new Date(certificate.issuedAt).toLocaleDateString()} · ID: {certificate.id}
      </p>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient hover:opacity-90 shadow-glow-sm disabled:opacity-60 transition-opacity px-5 py-2.5 text-sm font-semibold text-white"
      >
        {downloading ? "Preparing PDF…" : "⬇ Download Certificate"}
      </button>

      <p className="text-[10px] text-ink-500 mt-4 max-w-md mx-auto leading-relaxed">
        {certificate.mode === "company" && certificate.company
          ? `Issued by Interview Prep (Aakara.AI) based on independent practice-test performance. Not issued, endorsed by, or affiliated with ${certificate.company}.`
          : "Issued by Interview Prep (Aakara.AI) based on independent practice-test performance."}
      </p>
    </div>
  );
}
