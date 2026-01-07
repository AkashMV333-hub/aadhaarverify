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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.xml';
    cb(null, 'aadhaar-' + uniqueSuffix + ext);
  }
});

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

// Home route (serves simple UI)
app.get('/', (req, res) => {
  // keep the original HTML served previously
  res.sendFile(path.join(__dirname, '../src/ui.html'));
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
