# Aadhaar XML Verifier - Quick Start Guide

## What This Application Does

This independent application verifies the authenticity and integrity of Aadhaar Offline eKYC XML files by:

1. **Checking Digital Signature** - Ensures the XML is signed by UIDAI
2. **Validating Certificate** - Verifies the signing certificate is from UIDAI
3. **Detecting Tampering** - Identifies if data has been modified after signing
4. **Preventing Forgery** - Rejects manually created or fake XML files

## Installation

```bash
cd C:\Users\mvaka\OneDrive\Desktop\MajorProject\aadhaar
npm install
```

## Three Ways to Use

### 1. Web Interface (Easiest)

Start the server:
```bash
npm run server
```

Then open: `http://localhost:3000`

You'll see a beautiful web interface where you can:
- Drag and drop XML files
- Get instant verification results
- See detailed error messages

### 2. API (For Integration)

Start the server and make API calls:

```bash
npm run server
```

Test with curl:
```bash
curl -X POST -F "file=@path/to/aadhaar.xml" http://localhost:3000/verify
```

Or use in your code:
```javascript
const formData = new FormData();
formData.append('file', xmlFile);

const response = await fetch('http://localhost:3000/verify', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### 3. Command Line (For Testing)

```bash
npm run verify -- --file path/to/aadhaar.xml
```

With detailed output:
```bash
npm run verify -- --file path/to/aadhaar.xml --verbose
```

## Understanding the Results

### ✓ Success (Authentic XML)

```json
{
  "verified": true,
  "message": "XML is authentic and signed by UIDAI",
  "details": {
    "hasSignature": true,
    "signatureValid": true,
    "certificateValid": true,
    "dataIntegrity": "intact"
  }
}
```

**Meaning:** The XML is genuine, signed by UIDAI, and safe to use.

### ✗ Failure (No Signature)

```json
{
  "verified": false,
  "message": "XML is not digitally signed - possibly manually created",
  "details": {
    "hasSignature": false
  }
}
```

**Meaning:** The XML is fake or manually created. Reject it.

### ✗ Failure (Tampered Data)

```json
{
  "verified": false,
  "message": "Data has been tampered - signature mismatch",
  "details": {
    "hasSignature": true,
    "signatureValid": false,
    "dataIntegrity": "compromised"
  }
}
```

**Meaning:** The XML was originally valid but has been modified. Reject it.

## Integration with Your Social Media Project

### Option 1: Use as Microservice

Keep this as a separate service running on localhost:3000, and call it from your main app:

```javascript
// In your social media app
async function verifyAadhaar(xmlFile) {
  const formData = new FormData();
  formData.append('file', xmlFile);

  const response = await fetch('http://localhost:3000/verify', {
    method: 'POST',
    body: formData
  });

  return await response.json();
}

// In your registration handler
if (result.verified) {
  // Proceed with registration
  await registerUser(userData);
} else {
  // Show error
  alert('Invalid Aadhaar: ' + result.message);
}
```

### Option 2: Import as Module

Copy `src/verifier.js` to your project and use directly:

```javascript
import AadhaarVerifier from './utils/aadhaar-verifier.js';

const verifier = new AadhaarVerifier();
const result = await verifier.verify(xmlContent);
```

## File Structure

```
aadhaar/
├── src/
│   ├── verifier.js      # Core verification logic
│   ├── server.js        # Web server + API
│   ├── cli.js           # Command line interface
│   └── index.js         # Module exports
├── package.json         # Dependencies
├── README.md            # Overview
├── USAGE.md             # Detailed usage guide
├── EXAMPLE.md           # Examples and integration
├── QUICKSTART.md        # This file
└── test-setup.js        # Setup test script
```

## Key Features

### Security Checks

- ✓ Digital signature verification using XML-DSig
- ✓ X.509 certificate validation
- ✓ UIDAI issuer verification
- ✓ Certificate expiry checking
- ✓ Data tampering detection
- ✓ Structure validation

### Technologies Used

- **xml-crypto**: Digital signature verification
- **node-forge**: Certificate processing
- **xmldom**: XML parsing
- **express**: Web server
- **multer**: File upload handling

## Testing

Run the setup test to verify everything works:

```bash
node test-setup.js
```

Expected output:
```
✓ Test 1: Creating verifier instance...
  Success: Verifier instance created

✓ Test 2: Testing with invalid XML...
  Result: ✓ PASS
  Message: XML is not digitally signed

✓ Test 3: Testing with unsigned XML...
  Result: ✓ PASS
  Has Signature: false

...

All components are working correctly.
```

## Getting Real Aadhaar XML for Testing

1. Go to https://myaadhaar.uidai.gov.in/
2. Click "Download Aadhaar"
3. Choose "Offline eKYC" option
4. Enter your Aadhaar number
5. Create a share code (password)
6. Download the ZIP file
7. Extract the XML file
8. Test with this verifier

**IMPORTANT:** Never commit real Aadhaar files to version control!

## Common Commands

```bash
# Install dependencies
npm install

# Start web server
npm run server

# Verify a file (CLI)
npm run verify -- --file aadhaar.xml

# Verify with details
npm run verify -- --file aadhaar.xml --verbose

# Test setup
node test-setup.js
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/verify` | POST | Verify XML file |
| `/health` | GET | Health check |
| `/api/info` | GET | API information |

## Next Steps

1. **Test the web interface**
   ```bash
   npm run server
   # Visit http://localhost:3000
   ```

2. **Test with real Aadhaar XML**
   - Get your Aadhaar XML from UIDAI
   - Test verification
   - Check the results

3. **Integrate with your social media app**
   - Use the API endpoint
   - Add to registration flow
   - Implement error handling

4. **Add additional security**
   - Prevent replay attacks (same file used twice)
   - Implement rate limiting
   - Add logging for verification attempts

## Troubleshooting

### Port 3000 already in use

Change the port:
```bash
PORT=3001 npm run server
```

### Module not found errors

Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Verification fails for valid files

- Check if the XML is from UIDAI (not manually created)
- Ensure file is not corrupted
- Try with verbose mode to see details

## Support

For issues or questions:
1. Check USAGE.md for detailed documentation
2. Check EXAMPLE.md for integration examples
3. Review the code in src/verifier.js

## Security Note

This verifier checks:
- ✓ Is the XML signed by UIDAI?
- ✓ Has the data been tampered with?
- ✓ Is the certificate valid?

This verifier does NOT:
- ✗ Decrypt the data (you need share code)
- ✗ Verify if Aadhaar number is real
- ✗ Check if uploader owns the Aadhaar
- ✗ Prevent replay attacks

You need to implement additional security measures in your application!

## License

MIT

---

**You're ready to go! Start the server and test it out:**

```bash
npm run server
```

Then visit http://localhost:3000 and upload an Aadhaar XML file to see it in action!
