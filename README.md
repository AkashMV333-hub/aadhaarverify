# Aadhaar XML Verifier

An independent application to verify the authenticity and integrity of Aadhaar Offline eKYC XML files.

## Features

- **Digital Signature Verification**: Validates XML is signed by UIDAI using their public certificates
- **Data Integrity Check**: Ensures no tampering has occurred
- **Certificate Validation**: Verifies the signing certificate is from UIDAI
- **Multiple Interfaces**: CLI and Web API support

## Installation

```bash
npm install
```

## Usage

### Web Server (Recommended)

Start the web server:

```bash
npm run server
```

The server will run on `http://localhost:3000`

#### API Endpoints:

**POST /verify**
- Upload XML file for verification
- Returns detailed verification results

Example using curl:
```bash
curl -X POST -F "file=@path/to/aadhaar.xml" http://localhost:3000/verify
```

### Command Line Interface

Verify a single XML file:

```bash
npm run verify -- --file path/to/aadhaar.xml
```

## Verification Process

The application performs the following checks:

1. **XML Structure Validation**: Ensures the file is valid XML
2. **Signature Presence**: Checks if digital signature exists
3. **Certificate Extraction**: Extracts the X.509 certificate from XML
4. **Certificate Validation**: Verifies the certificate is from UIDAI
5. **Signature Verification**: Validates the digital signature using cryptographic verification
6. **Data Integrity**: Ensures all data has not been tampered with

## Response Format

```json
{
  "valid": true,
  "verified": true,
  "details": {
    "hasSignature": true,
    "signatureValid": true,
    "certificateValid": true,
    "issuer": "UIDAI",
    "dataIntegrity": "intact"
  },
  "message": "XML is authentic and signed by UIDAI",
  "timestamp": "2025-10-22T..."
}
```

## Security Notes

- This application verifies UIDAI digital signatures
- Unsigned or tampered XMLs will be rejected
- Certificate chain validation ensures authenticity
- All cryptographic operations use industry-standard libraries

## Integration

This is an independent application that can be integrated into your social media project by:
1. Using the API endpoints
2. Importing the verification module
3. Running as a microservice

## License

MIT
