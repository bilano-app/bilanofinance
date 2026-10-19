import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const akuntansiDir = path.resolve(__dirname, "..", "client", "public", "Akuntansi");

const pdfFiles = [
  "LOGIKA AKUNTANSI - Adrien Fandra.pdf",
  "FULL ACCOUNTING - Adrien Fandra.pdf",
  "Gudang Soal Akuntansi - Adrien Fandra.pdf"
];

async function mergePDFs() {
  console.log("Merging accounting PDFs from:", akuntansiDir);
  const mergedPdf = await PDFDocument.create();

  for (const fileName of pdfFiles) {
    const filePath = path.join(akuntansiDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      process.exit(1);
    }
    console.log(`Loading: ${fileName} (${fs.statSync(filePath).size} bytes)...`);
    const fileBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    console.log(`Added ${copiedPages.length} pages from ${fileName}`);
  }

  const outputFileName = "Paket_Bundling_3_Buku_Akuntansi_Adrien_Fandra.pdf";
  const outputPath = path.join(akuntansiDir, outputFileName);
  console.log("Saving merged PDF to:", outputPath);
  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedBytes);
  console.log(`Successfully merged ${pdfFiles.length} books into: ${outputFileName} (${mergedBytes.length} bytes, total pages: ${mergedPdf.getPageCount()})`);
}

mergePDFs().catch(err => {
  console.error("Failed to merge PDFs:", err);
  process.exit(1);
});
