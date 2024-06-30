const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const puppeteer = require('puppeteer');
require("dotenv").config();
const { PDFDocument, rgb } = require('pdf-lib');

const corsOptions = {
    origin: 'https://cardify-six.vercel.app', // Replace with your frontend URL
    optionsSuccessStatus: 200
  };

app.use(express.static('public'));
app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(express.static(`/Projects/Cardify/Server/`));
app.use(express.json({ limit: '50mb' })); // Increase the limit to handle large image files
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.post("/card/download/", async (req, res) => {
    try {
      const htmlTempData1 = fs.readFileSync('./pages/card.html', 'utf8');
      let htmlTempData2 = fs.readFileSync('./pages/card-2.html', 'utf8');
      const formattedDate = formatDate(req.body.birthdate);
      htmlTempData2 = htmlTempData2.replace('##_Student_Name_##', req.body.studentName)
                                            .replace('##_Std_##', req.body.std)
                                            .replace('##_DOB_##', formattedDate)
                                            .replace('##_Student_Image_##', req.body.studentPicture); // Replace with base64 image

      (async () => {
        const browser = await puppeteer.launch({
            executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
            args: ['--no-sandbox',"--disabled-setupid-sandbox", "--single-process", "--no-zygote"]
        });
        const page = await browser.newPage();
        await page.setContent(htmlTempData2);
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
        });
        await browser.close();
        const pdfFileName = `card.pdf`;
        const pdfPath = `${pdfFileName}`;
        const pdfFile1 = "./card1.pdf";
        const mergePDFFileName = 'merged.pdf'
        fs.writeFileSync(pdfPath, pdfBuffer);
        const mergedPdfBytes = await mergePDFs([pdfFile1, pdfPath]);
        fs.writeFileSync(mergePDFFileName, mergedPdfBytes);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.end(mergedPdfBytes, () => {
          fs.unlink(mergePDFFileName, (err) => {
            if (err) {
                console.error(`Error deleting PDF file: ${err}`);
            } else {
                console.log(`Deleted PDF file: ${mergePDFFileName}`);
            }
        });  
          fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error(`Error deleting PDF file: ${err}`);
                } else {
                    console.log(`Deleted PDF file: ${pdfPath}`);
                }
            });
        });
      })();

    } catch (e) {
      console.log("Error", e);
      res.status(500).json({ error: "An error occurred" });
    }
  });
  
  // Function to merge PDF files using pdf-lib
  async function mergePDFs(pdfFiles) {
    const mergedPdf = await PDFDocument.create();
    for (const pdfFile of pdfFiles) {
      const pdfBytes = fs.readFileSync(pdfFile);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}


app.listen(4000, ()=> {
    console.log("Server is listening port 4000");
});