# Example: Aadhaar XML Verification

## How Aadhaar Offline XML Works

When you download your Aadhaar from UIDAI's website using the offline eKYC feature:

1. You get a password-protected ZIP file
2. Inside is an XML file containing your encrypted Aadhaar data
3. The XML is digitally signed by UIDAI using their private key
4. The signature ensures authenticity and prevents tampering

## What This Verifier Checks

### 1. Digital Signature Verification

The XML contains a `<Signature>` element with:
- SignedInfo: The data that was signed
- SignatureValue: The encrypted signature
- KeyInfo: The public certificate

Example structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfflinePaperlessKyc>
  <UidData>
    <!-- Encrypted Aadhaar data -->
  </UidData>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="..."/>
      <SignatureMethod Algorithm="..."/>
      <Reference URI="">
        <Transforms>...</Transforms>
        <DigestMethod Algorithm="..."/>
        <DigestValue>...</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>...</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</OfflinePaperlessKyc>
```

### 2. Certificate Validation

The verifier extracts the X.509 certificate and checks:
- Issuer is UIDAI
- Certificate is within validity period
- Certificate chain is valid

### 3. Tampering Detection

If someone modifies the XML after it's signed:
- The signature will no longer match
- Verification will fail
- Data is marked as "compromised"

## Testing Examples

### Example 1: Verify Valid Aadhaar XML

```bash
npm run verify -- --file /path/to/valid-aadhaar.xml
```

**Expected Output:**
```
🔐 Aadhaar XML Verifier

Verifying: /path/to/valid-aadhaar.xml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


✓ VERIFICATION SUCCESSFUL

XML is authentic and signed by UIDAI - Data integrity verified

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification Details:

  Structure Valid:    ✓ Yes
  Has Signature:      ✓ Yes
  Signature Valid:    ✓ Yes
  Certificate Valid:  ✓ Yes
  Data Integrity:     ✓ Intact

  Certificate Issuer: C=IN, O=UIDAI, CN=...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timestamp: 2025-10-22T...
```

### Example 2: Verify Tampered XML

If someone modifies the data in the XML:

```bash
npm run verify -- --file /path/to/tampered-aadhaar.xml
```

**Expected Output:**
```
✗ VERIFICATION FAILED

Data has been tampered - signature mismatch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification Details:

  Structure Valid:    ✓ Yes
  Has Signature:      ✓ Yes
  Signature Valid:    ✗ No
  Certificate Valid:  ✓ Yes
  Data Integrity:     ✗ Compromised

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Errors:

  1. Digital signature verification failed
```

### Example 3: Verify Manually Created XML

If someone creates a fake XML without UIDAI signature:

```bash
npm run verify -- --file /path/to/fake-aadhaar.xml
```

**Expected Output:**
```
✗ VERIFICATION FAILED

XML is not digitally signed - possibly manually created

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification Details:

  Structure Valid:    ✓ Yes
  Has Signature:      ✗ No
  Signature Valid:    ✗ No
  Certificate Valid:  ✗ No
  Data Integrity:     unknown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Errors:

  1. No digital signature found in XML
```

## Web Interface Example

Start the server:
```bash
npm run server
```

Visit `http://localhost:3000` and you'll see a beautiful web interface.

### API Example with JavaScript

```javascript
// In your web app
async function verifyAadhaarFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:3000/verify', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.verified) {
      console.log('✓ Aadhaar verified successfully!');
      console.log('Certificate Issuer:', result.details.certificateIssuer);
      console.log('Data Integrity:', result.details.dataIntegrity);

      // Proceed with registration
      proceedWithRegistration(result);
    } else {
      console.error('✗ Verification failed:', result.message);
      console.error('Errors:', result.errors);

      // Show error to user
      showError(result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Usage
const fileInput = document.getElementById('aadhaar-upload');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  verifyAadhaarFile(file);
});
```

## Integration with Your Social Media App

### Step 1: Registration Form

```html
<!-- In your registration page -->
<form id="registration-form">
  <h2>Register with Aadhaar</h2>

  <input type="file" id="aadhaar-xml" accept=".xml" required>

  <button type="submit">Verify and Register</button>

  <div id="verification-status"></div>
</form>
```

### Step 2: Verification Logic

```javascript
// registration.js
import AadhaarVerifier from './aadhaar-verifier.js';

const verifier = new AadhaarVerifier();

document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('aadhaar-xml');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select Aadhaar XML file');
    return;
  }

  // Show loading
  showLoading();

  try {
    // Read file content
    const xmlContent = await file.text();

    // Verify the XML
    const verification = await verifier.verify(xmlContent);

    if (verification.verified) {
      // Extract user data from XML
      const userData = await extractAadhaarData(xmlContent, file.name.replace('.xml', ''));

      // Register the user
      await registerUser(userData);

      showSuccess('Registration successful!');
      redirectToDashboard();
    } else {
      // Show verification failure
      showError(`Verification failed: ${verification.message}`);

      // Log the attempt for security
      logFailedVerification(verification);
    }
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Extract user data (you need to decrypt the data using the share code)
async function extractAadhaarData(xmlContent, shareCode) {
  // Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  // Get encrypted data
  const uidDataNode = doc.getElementsByTagName('UidData')[0];

  // You need to implement decryption using the share code
  // This is a separate process that requires the password/share code
  // provided when downloading the Aadhaar

  return {
    name: 'Extracted from decrypted data',
    dob: 'Extracted from decrypted data',
    gender: 'Extracted from decrypted data',
    // ... other fields
  };
}

// Register user in your database
async function registerUser(userData) {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }

  return response.json();
}
```

## Security Considerations

### What This Verifier DOES:

✓ Verifies the XML is signed by UIDAI
✓ Detects any tampering with the data
✓ Validates certificate authenticity
✓ Ensures data integrity

### What This Verifier DOES NOT:

✗ Decrypt the encrypted data (you need the share code for that)
✗ Validate if the Aadhaar number is real
✗ Check if the person uploading owns the Aadhaar
✗ Prevent replay attacks (same file used multiple times)

### Additional Security Measures You Should Implement:

1. **Replay Attack Prevention**
   ```javascript
   // Store hash of verified XMLs
   const xmlHash = crypto.createHash('sha256').update(xmlContent).digest('hex');

   // Check if already used
   if (await isXmlAlreadyUsed(xmlHash)) {
     throw new Error('This Aadhaar XML has already been used');
   }

   // Store the hash
   await storeUsedXmlHash(xmlHash);
   ```

2. **Share Code Verification**
   - After verifying authenticity, decrypt the data
   - Require user to enter the share code
   - Only proceed if decryption succeeds

3. **Photo Verification**
   - Extract photo from decrypted data
   - Ask user to upload selfie
   - Use face matching to verify identity

4. **OTP Verification**
   - Send OTP to the mobile number in Aadhaar
   - Verify user has access to that number

5. **Rate Limiting**
   ```javascript
   // Limit verification attempts
   const attempts = await getVerificationAttempts(ipAddress);
   if (attempts > 5) {
     throw new Error('Too many verification attempts');
   }
   ```

## Complete Flow

```
User Registration Flow:

1. User downloads Aadhaar XML from UIDAI
   ↓
2. User uploads XML to your app
   ↓
3. Your app verifies XML authenticity (this verifier)
   ↓
4. If verified, user enters share code
   ↓
5. Your app decrypts the XML data
   ↓
6. Extract user details (name, photo, etc.)
   ↓
7. Additional verification (OTP, selfie, etc.)
   ↓
8. Register user in your database
   ↓
9. User can now use your social media app
```

## Common Issues and Solutions

### Issue: "xmldom is deprecated"

The `xmldom` package may show deprecation warnings. You can replace it with `@xmldom/xmldom`:

```bash
npm uninstall xmldom
npm install @xmldom/xmldom
```

Then update imports in `src/verifier.js`.

### Issue: Certificate validation fails for valid files

Some UIDAI certificates may have different issuer formats. You can extend the `uidaiIssuers` array:

```javascript
this.uidaiIssuers = [
  'UIDAI',
  'Unique Identification Authority of India',
  'UID',
  'C=IN, O=UIDAI',
  'CN=UIDAI',
  // Add more variants if needed
];
```

### Issue: Signature verification fails

Try the manual verification method if the library method fails. The code already includes both methods.

## Next Steps

1. **Test with real Aadhaar XML files**
   - Download your own Aadhaar
   - Test the verifier
   - Ensure it works correctly

2. **Implement data decryption**
   - Use the share code to decrypt
   - Extract user information
   - Display user data

3. **Integrate with your social media app**
   - Add to registration flow
   - Implement additional security
   - Test end-to-end

4. **Deploy to production**
   - Use HTTPS
   - Implement rate limiting
   - Add logging and monitoring
   - Secure storage of user data

## Resources

- [UIDAI Offline Aadhaar](https://uidai.gov.in/en/my-aadhaar/get-aadhaar/download-aadhaar.html)
- [XML Digital Signatures](https://www.w3.org/TR/xmldsig-core/)
- [X.509 Certificates](https://en.wikipedia.org/wiki/X.509)
- [Node-Forge Documentation](https://github.com/digitalbazaar/forge)
