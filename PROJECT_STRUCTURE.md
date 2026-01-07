# Project Structure

## Complete File Organization

```
aadhaar-xml-verifier/
│
├── src/                          # Source code
│   ├── verifier.js              # Core verification logic (Main component)
│   ├── server.js                # Express web server + API
│   ├── cli.js                   # Command line interface
│   └── index.js                 # Module exports
│
├── node_modules/                # Dependencies (auto-generated)
│
├── uploads/                     # Temporary file uploads (auto-created)
│
├── package.json                 # NPM configuration & dependencies
├── package-lock.json            # Dependency lock file
│
├── .gitignore                   # Git ignore rules
├── .env.example                 # Environment variables template
│
├── README.md                    # Project overview
├── QUICKSTART.md                # Quick start guide
├── USAGE.md                     # Detailed usage instructions
├── EXAMPLE.md                   # Integration examples
├── PROJECT_STRUCTURE.md         # This file
│
└── test-setup.js                # Setup verification test
```

## Key Components

### 1. Core Verification (src/verifier.js)

**Purpose:** Main verification logic

**Key Classes:**
- `AadhaarVerifier` - Main class for verification

**Key Methods:**
- `verify(xmlContent)` - Verify XML content
- `verifyFile(filePath)` - Verify from file path
- `parseXML(xmlContent)` - Parse and validate XML
- `findSignature(doc)` - Locate digital signature
- `extractCertificate(doc)` - Extract X.509 certificate
- `validateCertificate(certPem)` - Validate certificate
- `verifySignature(xmlContent, doc, cert)` - Verify digital signature
- `checkDataIntegrity(doc)` - Check data integrity

**Dependencies:**
- xmldom - XML parsing
- xml-crypto - Signature verification
- node-forge - Certificate handling
- xpath - XML querying

### 2. Web Server (src/server.js)

**Purpose:** HTTP API and web interface

**Routes:**
- `GET /` - Web interface with file upload
- `POST /verify` - Verify uploaded XML file
- `GET /health` - Health check endpoint
- `GET /api/info` - API information

**Features:**
- File upload with multer
- CORS enabled
- 5MB file size limit
- Automatic file cleanup
- Error handling

**Dependencies:**
- express - Web framework
- multer - File upload handling
- cors - Cross-origin requests

### 3. CLI Interface (src/cli.js)

**Purpose:** Command line tool

**Usage:**
```bash
npm run verify -- --file <path> [--verbose]
```

**Features:**
- Colored output with chalk
- Detailed verification results
- Verbose mode for debugging
- Exit codes (0 = success, 1 = failure)

**Dependencies:**
- commander - CLI framework
- chalk - Terminal colors

### 4. Module Export (src/index.js)

**Purpose:** ES6 module exports

**Usage:**
```javascript
import AadhaarVerifier from './src/index.js';
const verifier = new AadhaarVerifier();
```

## Verification Flow

```
User uploads XML
       ↓
┌──────────────────┐
│  Parse XML       │
│  (parseXML)      │
└──────────────────┘
       ↓
┌──────────────────┐
│  Find Signature  │
│  (findSignature) │
└──────────────────┘
       ↓
┌──────────────────┐
│  Extract Cert    │
│  (extractCert)   │
└──────────────────┘
       ↓
┌──────────────────┐
│  Validate Cert   │
│  (validateCert)  │
└──────────────────┘
       ↓
┌──────────────────┐
│  Verify Sig      │
│  (verifySig)     │
└──────────────────┘
       ↓
┌──────────────────┐
│  Check Integrity │
│  (checkIntegrity)│
└──────────────────┘
       ↓
   Return Result
```

## Data Flow

### Web Interface Flow

```
Browser
   ↓ (Upload XML)
Server (multer middleware)
   ↓ (Save to uploads/)
Verifier.verifyFile()
   ↓ (Read file)
Verifier.verify()
   ↓ (Verification logic)
Result JSON
   ↓ (Send response)
Browser (Display result)
   ↓
Delete temp file
```

### CLI Flow

```
Terminal command
   ↓
cli.js (parse arguments)
   ↓
Verifier.verifyFile()
   ↓
Verifier.verify()
   ↓
Format output (chalk)
   ↓
Print to terminal
   ↓
Exit with code
```

### API Flow

```
HTTP POST /verify
   ↓
Express route handler
   ↓
Multer (save file)
   ↓
Verifier.verifyFile()
   ↓
Result JSON
   ↓
HTTP response
   ↓
Cleanup temp file
```

## Dependencies Overview

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web server framework |
| multer | ^2.0.0 | File upload handling |
| xmldom | ^0.6.0 | XML DOM parsing |
| node-forge | ^1.3.1 | Cryptography (certificates) |
| xml-crypto | ^5.0.0 | XML signature verification |
| xpath | ^0.0.32 | XML querying |
| commander | ^11.1.0 | CLI framework |
| chalk | ^5.3.0 | Terminal colors |
| cors | ^2.8.5 | CORS middleware |

### Why Each Dependency?

**express**: Provides HTTP server for web interface and API
**multer**: Handles multipart/form-data file uploads
**xmldom**: Parses XML into DOM structure for manipulation
**node-forge**: Advanced crypto operations (X.509 certificates)
**xml-crypto**: Validates XML digital signatures per W3C standards
**xpath**: Query XML using XPath expressions
**commander**: Build CLI with options and arguments
**chalk**: Colored terminal output for better UX
**cors**: Enable cross-origin requests for API

## Security Layers

### Layer 1: Structure Validation
- XML parsing
- Schema validation
- Required elements check

### Layer 2: Signature Presence
- Locate signature element
- Verify signature exists
- Check signature format

### Layer 3: Certificate Validation
- Extract X.509 certificate
- Verify issuer is UIDAI
- Check validity period
- Validate certificate chain

### Layer 4: Cryptographic Verification
- Verify digital signature
- Use public key from certificate
- Compare signature with signed data
- Dual verification (xml-crypto + forge)

### Layer 5: Data Integrity
- Check required elements
- Verify encrypted data present
- Validate structure compliance
- Detect tampering

## Extensibility

### Adding New Verification Checks

Add to `src/verifier.js`:

```javascript
checkCustomValidation(doc) {
  // Your custom logic
  return {
    valid: true/false,
    details: {...}
  };
}
```

Then call in `verify()` method.

### Adding API Endpoints

Add to `src/server.js`:

```javascript
app.post('/custom-endpoint', async (req, res) => {
  // Your logic
  res.json(result);
});
```

### Adding CLI Commands

Add to `src/cli.js`:

```javascript
program
  .command('new-command')
  .description('Description')
  .action(() => {
    // Your logic
  });
```

## Performance Considerations

- **File size limit**: 5MB (configurable)
- **Verification time**: ~100-500ms per file
- **Memory usage**: ~50MB per verification
- **Concurrent requests**: Supported (stateless)
- **CPU usage**: Cryptographic operations are CPU intensive

## Testing Strategy

### Unit Tests (Recommended to add)

```javascript
// test/verifier.test.js
import { expect } from 'chai';
import AadhaarVerifier from '../src/verifier.js';

describe('AadhaarVerifier', () => {
  it('should reject unsigned XML', async () => {
    const verifier = new AadhaarVerifier();
    const result = await verifier.verify('<xml/>');
    expect(result.verified).to.be.false;
  });
});
```

### Integration Tests

```javascript
// test/api.test.js
import request from 'supertest';
import app from '../src/server.js';

describe('POST /verify', () => {
  it('should accept XML file upload', async () => {
    const response = await request(app)
      .post('/verify')
      .attach('file', 'test/sample.xml');

    expect(response.status).to.equal(200);
  });
});
```

## Deployment Recommendations

### Development
```bash
npm run server
```

### Production

**Option 1: PM2**
```bash
npm install -g pm2
pm2 start src/server.js --name aadhaar-verifier
pm2 save
pm2 startup
```

**Option 2: Docker**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "server"]
```

**Option 3: Systemd Service**
```ini
[Unit]
Description=Aadhaar XML Verifier
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/aadhaar
ExecStart=/usr/bin/node src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Logs

Add logging middleware:

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});
```

## Future Enhancements

### Suggested Improvements

1. **Rate Limiting**
   - Add express-rate-limit
   - Prevent abuse

2. **Caching**
   - Cache verification results
   - Use Redis for distributed cache

3. **Database Logging**
   - Log all verification attempts
   - Store file hashes to prevent replay

4. **Webhook Support**
   - Async verification
   - Callback on completion

5. **Batch Processing**
   - Verify multiple files
   - Queue-based processing

6. **Enhanced Security**
   - JWT authentication
   - API key validation
   - IP whitelisting

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Browser/  │
│   API)      │
└──────┬──────┘
       │
       │ HTTP Request
       ↓
┌─────────────────────────────────┐
│      Express Server             │
│  ┌──────────────────────────┐  │
│  │  Multer Middleware       │  │
│  │  (File Upload)           │  │
│  └────────┬─────────────────┘  │
│           │                     │
│           ↓                     │
│  ┌──────────────────────────┐  │
│  │  Route Handler           │  │
│  │  /verify, /health, etc   │  │
│  └────────┬─────────────────┘  │
└───────────┼─────────────────────┘
            │
            ↓
┌─────────────────────────────────┐
│    AadhaarVerifier Class        │
│  ┌──────────────────────────┐  │
│  │  XML Parser (xmldom)     │  │
│  └────────┬─────────────────┘  │
│           │                     │
│           ↓                     │
│  ┌──────────────────────────┐  │
│  │  Signature Finder        │  │
│  │  (xpath)                 │  │
│  └────────┬─────────────────┘  │
│           │                     │
│           ↓                     │
│  ┌──────────────────────────┐  │
│  │  Certificate Extractor   │  │
│  │  (node-forge)            │  │
│  └────────┬─────────────────┘  │
│           │                     │
│           ↓                     │
│  ┌──────────────────────────┐  │
│  │  Signature Verifier      │  │
│  │  (xml-crypto + forge)    │  │
│  └────────┬─────────────────┘  │
│           │                     │
│           ↓                     │
│  ┌──────────────────────────┐  │
│  │  Integrity Checker       │  │
│  └────────┬─────────────────┘  │
└───────────┼─────────────────────┘
            │
            ↓
   ┌────────────────┐
   │  Result JSON   │
   └────────────────┘
```

## Code Quality

### Linting (Recommended)

Add ESLint:
```bash
npm install --save-dev eslint
npx eslint --init
```

### Formatting

Add Prettier:
```bash
npm install --save-dev prettier
```

### Pre-commit Hooks

Add Husky:
```bash
npm install --save-dev husky
npx husky install
```

## License

MIT - See LICENSE file for details
