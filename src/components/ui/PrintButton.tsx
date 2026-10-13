"use client";

/**
 * Triggers the browser print dialog — the print sheet is designed to be printed
 * on A4 (or saved as PDF) straight from the browser, so the printing house only
 * ever receives one ready-made file/layout.
 */
export default function PrintButton({
  label = "Print / Simpan PDF",
  className = "btn btn-primary",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}
