const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

require("dotenv").config();

const corsOptions = {
    origin: 'https://cardify-six.vercel.app', // Replace with your frontend URL
    optionsSuccessStatus: 200
};

app.use(express.static('public'));
app.use(cors(corsOptions));
app.use(express.static(`/Projects/Cardify/Server/`));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Endpoint to generate and download the merged PDF
app.post("/card/download/", async (req, res) => {
    try {
        let htmlTempData1 = fs.readFileSync('./pages/card.html', 'utf8');
        let htmlTempData2 = fs.readFileSync('./pages/card-2.html', 'utf8');
        const formattedDate = formatDate(req.body.birthdate);

        // Replace placeholders in HTML templates with actual data
        htmlTempData1 = htmlTempData1.replace('##_Student_Image_##', req.body.studentPicture);
        htmlTempData2 = htmlTempData2.replace('##_Student_Name_##', req.body.studentName)
                                     .replace('##_Std_##', req.body.std)
                                     .replace('##_DOB_##', formattedDate)
                                     .replace('##_Student_Image_##', req.body.studentPicture);

        const pdfFile1 = await generatePDF(htmlTempData1);
        const pdfFile2 = await generatePDF(htmlTempData2);

        const mergedPdfBytes = await mergePDFs([pdfFile1, pdfFile2]);
        
        // Set response headers for the merged PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
        res.end(mergedPdfBytes);

    } catch (e) {
        console.log("Error", e);
        res.status(500).json({ error: "An error occurred" });
    }
});

// Function to generate PDF from HTML content using Puppeteer
async function generatePDF(htmlContent) {
    const browser = await puppeteer.launch({
        executablePath: process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
        args: ['--no-sandbox', "--disabled-setupid-sandbox", "--single-process", "--no-zygote"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
    });
    await browser.close();

    return pdfBuffer;
}

// Function to merge PDF buffers using pdf-lib
async function mergePDFs(pdfBuffers) {
    try {
        const mergedPdf = await PDFDocument.create();
        for (const pdfBuffer of pdfBuffers) {
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        return await mergedPdf.save();
    } catch (e) {
        console.error(`Error merging PDFs: ${e}`);
        throw e;
    }
}

// Function to format date in DD/MM/YYYY format
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Start the server
app.listen(4000, () => {
    console.log("Server is listening on port 4000");
});
