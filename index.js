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

      htmlTempData2 = htmlTempData2.replace('##_Student_Name_##', req.body.studentName)
                                            .replace('##_Std_##', req.body.std)
                                            .replace('##_DOB_##', new Date(req.body.birthdate).toLocaleDateString())
                                            .replace('##_Student_Image_##', req.body.studentPicture); // Replace with base64 image
  
      // const browser = await puppeteer.launch({
      //   executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
      //   args: ['--no-sandbox', "--disabled-setupid-sandbox", "--single-process", "--no-zygote"]
      // });
  
      // const generatePDF = async (htmlContent, fileName) => {
      //   const page = await browser.newPage();
      //   await page.setContent(htmlContent);
      //   const pdfBuffer = await page.pdf({
      //     format: 'A4',
      //     landscape: true,
      //     printBackground: true,
      //   });
      //   await page.close();
      //   fs.writeFileSync(fileName, pdfBuffer);
      //   return fileName;
      // };
  
      // const pdfFile1 = await generatePDF(htmlTempData1, 'card1.pdf');
      // const pdfFile2 = await generatePDF(htmlTempData2, 'card2.pdf');
  
      // // Merge PDF files using pdf-lib
      // const mergedPdfBytes = await mergePDFs([pdfFile1, pdfFile2]);
  
      // // Write the merged PDF to a file or send it as a response
      // fs.writeFileSync('merged.pdf', mergedPdfBytes);
  
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename="merged.pdf"`);
      // res.end(mergedPdfBytes, () => {
      //       fs.unlink('./merged.pdf', (err) => {
      //           if (err) {
      //               console.error(`Error deleting PDF file: ${err}`);
      //           } else {
      //               console.log(`Deleted PDF file: merged.pdf`);
      //           }
      //       });
      //   });

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
        fs.writeFileSync(pdfPath, pdfBuffer);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.end(pdfBuffer, () => {
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


app.listen(4000, ()=> {
    console.log("Server is listening port 4000");
});