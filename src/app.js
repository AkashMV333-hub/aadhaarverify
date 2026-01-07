import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import * as zipjs from '@zip.js/zip.js';
import { fileURLToPath } from 'url';
import AadhaarVerifier from './verifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Detect if running in serverless environment
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage based on environment
let storage;
if (isServerless) {
  // Use memory storage for serverless (Vercel)
  storage = multer.memoryStorage();
} else {
  // Use disk storage for local development
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase() || '.xml';
      cb(null, 'aadhaar-' + uniqueSuffix + ext);
    }
  });
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.xml', '.zip'];
    if (allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only XML or ZIP files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Initialize verifier
const verifier = new AadhaarVerifier();

// Home route (serves simple UI inline, no file read)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aadhaar XML Verifier</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 32px; text-align: center; }
        .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 14px; }
        .upload-area { border: 3px dashed #667eea; border-radius: 15px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s ease; margin-bottom: 20px; }
        .upload-area:hover { border-color: #764ba2; background: #f8f9ff; }
        .upload-area.dragover { background: #f0f2ff; border-color: #764ba2; }
        input[type="file"], input[type="password"] { width: 100%; padding: 10px; margin-top: 12px; border-radius: 8px; border: 1px solid #e6e6e6; font-size: 14px; }
        input[type="file"] { display: none; }
        input[type="password"] { display: none; }
        input[type="password"].show { display: block; }
        .upload-icon { font-size: 48px; margin-bottom: 10px; }
        .upload-text { color: #666; font-size: 16px; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; transition: transform 0.2s; margin-top: 12px; }
        .btn:hover { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .result { margin-top: 30px; padding: 20px; border-radius: 10px; display: none; }
        .result.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .result.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .result h3 { margin-bottom: 10px; }
        .result-details { font-size: 14px; margin-top: 10px; }
        .result-details ul { margin-left: 20px; margin-top: 10px; }
        .loader { border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .file-name { margin: 15px 0; padding: 10px; background: #f8f9ff; border-radius: 5px; color: #667eea; font-weight: 500; display: none; }
        .features { margin-top: 30px; padding-top: 30px; border-top: 1px solid #eee; }
        .feature { display: flex; align-items: center; margin-bottom: 15px; font-size: 14px; color: #666; }
        .feature-icon { margin-right: 10px; color: #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Aadhaar XML Verifier</h1>
        <p class="subtitle">Verify authenticity and integrity of Aadhaar Offline eKYC XML files</p>

        <div class="upload-area" id="uploadArea">
          <div class="upload-icon">📄</div>
          <div class="upload-text">
            <strong>Click to upload</strong> or drag and drop<br>
            <small>Aadhaar Offline XML file or password-protected ZIP (Max 5MB)</small>
          </div>
          <input type="file" id="fileInput" accept=".xml,.zip,text/xml,application/xml,application/zip">
        </div>

        <div class="file-name" id="fileName"></div>
        <input type="password" id="zipPassword" placeholder="ZIP password (if required)">
        <button class="btn" id="verifyBtn" disabled>Verify XML</button>

        <div class="loader" id="loader"></div>
        <div class="result" id="result"></div>

        <div class="features">
          <div class="feature"><span class="feature-icon">✓</span><span>Digital signature verification</span></div>
          <div class="feature"><span class="feature-icon">✓</span><span>UIDAI certificate validation</span></div>
          <div class="feature"><span class="feature-icon">✓</span><span>Data tampering detection</span></div>
          <div class="feature"><span class="feature-icon">✓</span><span>Structure integrity check</span></div>
        </div>
      </div>

      <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const verifyBtn = document.getElementById('verifyBtn');
        const loader = document.getElementById('loader');
        const resultDiv = document.getElementById('result');
        const fileNameDiv = document.getElementById('fileName');
        const pwInput = document.getElementById('zipPassword');
        let selectedFile = null;

        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            fileNameDiv.textContent = '📎 ' + selectedFile.name;
            fileNameDiv.style.display = 'block';
            if (selectedFile.name.toLowerCase().endsWith('.zip')) {
              pwInput.classList.add('show');
            } else {
              pwInput.classList.remove('show');
            }
            verifyBtn.disabled = false;
            resultDiv.style.display = 'none';
          }
        });

        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });

        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.zip')) {
              selectedFile = file;
              fileInput.files = e.dataTransfer.files;
              fileNameDiv.textContent = '📎 ' + selectedFile.name;
              fileNameDiv.style.display = 'block';
              if (selectedFile.name.toLowerCase().endsWith('.zip')) {
                pwInput.classList.add('show');
              } else {
                pwInput.classList.remove('show');
              }
              verifyBtn.disabled = false;
              resultDiv.style.display = 'none';
            } else {
              alert('Please upload an XML or ZIP file');
            }
          }
        });

        verifyBtn.addEventListener('click', async () => {
          if (!selectedFile) return;
          verifyBtn.disabled = true;
          loader.style.display = 'block';
          resultDiv.style.display = 'none';

          const formData = new FormData();
          formData.append('file', selectedFile);
          if (pwInput.classList.contains('show')) {
            formData.append('password', pwInput.value || '');
          }

          try {
            const response = await fetch('/api/verify', { method: 'POST', body: formData });
            const result = await response.json();

            resultDiv.className = 'result ' + (result.verified ? 'success' : 'error');
            let html = '<h3>' + (result.verified ? '✓ Verified' : '✗ Failed') + '</h3>';
            html += '<p>' + result.message + '</p>';

            if (result.details) {
              html += '<div class="result-details"><strong>Details:</strong><ul>';
              html += '<li>Signature: ' + (result.details.hasSignature ? '✓' : '✗') + '</li>';
              html += '<li>Valid: ' + (result.details.signatureValid ? '✓' : '✗') + '</li>';
              html += '<li>Certificate: ' + (result.details.certificateValid ? '✓' : '✗') + '</li>';
              if (result.details.certificateIssuer) html += '<li>Issuer: ' + result.details.certificateIssuer + '</li>';
              html += '<li>Integrity: ' + result.details.dataIntegrity + '</li></ul></div>';
            }

            if (result.errors && result.errors.length > 0) {
              html += '<div class="result-details"><strong>Errors:</strong><ul>';
              result.errors.forEach(e => html += '<li>' + e + '</li>');
              html += '</ul></div>';
            }

            resultDiv.innerHTML = html;
            resultDiv.style.display = 'block';
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<h3>✗ Error</h3><p>' + error.message + '</p>';
            resultDiv.style.display = 'block';
          } finally {
            loader.style.display = 'none';
            verifyBtn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Verify endpoint
app.post('/verify', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        valid: false,
        verified: false,
        message: 'No file uploaded',
        errors: ['No file provided']
      });
    }

    const uploadedExt = path.extname(req.file.originalname).toLowerCase();

    if (uploadedExt === '.zip') {
      const password = req.body.password || '';

      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const blob = new Blob([fileBuffer]);

        const reader = new zipjs.ZipReader(new zipjs.BlobReader(blob), { password });
        const entries = await reader.getEntries();
        const xmlEntry = entries.find((e) => e.filename && e.filename.toLowerCase().endsWith('.xml'));

        if (!xmlEntry) {
          await reader.close();
          try { fs.unlinkSync(req.file.path); } catch (e) {}
          return res.status(400).json({
            valid: false,
            verified: false,
            message: 'ZIP does not contain an XML file',
            errors: ['No XML file found inside ZIP']
          });
        }

        const xmlText = await xmlEntry.getData(new zipjs.TextWriter());
        await reader.close();

        try { fs.unlinkSync(req.file.path); } catch (e) {}

        const result = await verifier.verify(xmlText);
        return res.json(result);
      } catch (zipErr) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        console.error('ZIP extraction error (zip.js):', zipErr);

        const errMsg = zipErr && zipErr.message ? zipErr.message.toLowerCase() : '';
        if (errMsg.includes('encrypted') || errMsg.includes('password') || errMsg.includes('wrong password')) {
          return res.status(400).json({
            valid: false,
            verified: false,
            message: 'Failed to extract ZIP: the archive or its entries are encrypted. Provide the correct password in the password field.',
            errors: [zipErr && zipErr.message ? zipErr.message : String(zipErr)]
          });
        }

        return res.status(400).json({
          valid: false,
          verified: false,
          message: 'Failed to extract ZIP: ' + (zipErr && zipErr.message ? zipErr.message : 'unknown error'),
          errors: [zipErr && zipErr.message ? zipErr.message : String(zipErr)]
        });
      }
    } else {
      const result = await verifier.verifyFile(req.file.path);
      try { fs.unlinkSync(req.file.path); } catch (cleanupError) { console.error('Failed to delete temporary file:', cleanupError); }
      return res.json(result);
    }

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      valid: false,
      verified: false,
      message: 'Internal server error',
      errors: [error.message]
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Aadhaar XML Verifier', version: '1.0.0', timestamp: new Date().toISOString() });
});

export default app;
