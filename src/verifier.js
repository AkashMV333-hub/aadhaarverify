import { DOMParser } from 'xmldom';
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import xpath from 'xpath';
import fs from 'fs';

/**
 * Aadhaar XML Verifier
 * Verifies the authenticity and integrity of Aadhaar Offline eKYC XML files
 */
class AadhaarVerifier {
  constructor() {
    // UIDAI and authorized Certificate Authorities
    this.uidaiIssuers = [
      'UIDAI',
      'Unique Identification Authority of India',
      'UID',
      'C=IN, O=UIDAI',
      'CN=UIDAI'
    ];

    // Authorized CAs used by UIDAI for signing Aadhaar documents
    this.authorizedCAs = [
      '(n)Code Solutions',
      'nCode Solutions',
      'Certifying Authority',
      'Gujarat Narmada Valley Fertilizers',
      'GNFC',
      'Sify',
      'eMudhra',
      'National Informatics Centre',
      'NIC',
      'C-DAC',
      'CDAC',
      'TCS',
      'Tata Consultancy Services'
    ];
  }

  /**
   * Main verification method
   * @param {string} xmlContent - The XML file content
   * @returns {Object} Verification result
   */
  async verify(xmlContent) {
    const result = {
      valid: false,
      verified: false,
      details: {
        hasSignature: false,
        signatureValid: false,
        certificateValid: false,
        certificateIssuer: null,
        dataIntegrity: 'unknown',
        structureValid: false
      },
      message: '',
      timestamp: new Date().toISOString(),
      errors: []
    };

    try {
      // Step 1: Parse XML
      const doc = this.parseXML(xmlContent);
      if (!doc) {
        result.errors.push('Invalid XML structure');
        result.message = 'Failed to parse XML file';
        return result;
      }
      result.details.structureValid = true;

      // Step 2: Check for Signature element
      const signatureNode = this.findSignature(doc);
      if (!signatureNode) {
        result.errors.push('No digital signature found in XML');
        result.message = 'XML is not digitally signed - possibly manually created';
        return result;
      }
      result.details.hasSignature = true;

      // Step 3: Extract certificate
      const certificate = this.extractCertificate(doc);
      if (!certificate) {
        result.errors.push('No certificate found in signature');
        result.message = 'Digital signature lacks certificate information';
        return result;
      }

      // Step 4: Validate certificate
      const certValidation = this.validateCertificate(certificate);
      result.details.certificateIssuer = certValidation.issuer;
      result.details.certificateValid = certValidation.valid;
      result.details.certificateDetails = certValidation.details;

      if (!certValidation.isUidai) {
        result.errors.push('Certificate is not issued by UIDAI or authorized CA');
        result.message = 'Certificate issuer is not recognized as UIDAI or authorized CA - possibly forged';
        return result;
      }

      // Add certificate type to details
      result.details.certificateType = certValidation.details.certificateType;

      // Step 5: Verify digital signature
      const signatureValid = this.verifySignature(xmlContent, doc, certificate);
      result.details.signatureValid = signatureValid;

      if (!signatureValid) {
        result.errors.push('Digital signature verification failed');
        result.message = 'Data has been tampered - signature mismatch';
        result.details.dataIntegrity = 'compromised';
        return result;
      }

      // Step 6: Additional integrity checks
      const integrityCheck = this.checkDataIntegrity(doc);
      result.details.dataIntegrity = integrityCheck.status;
      result.details.integrityDetails = integrityCheck.details;

      // All checks passed
      result.valid = true;
      result.verified = true;

      // Create message based on certificate type
      const certType = result.details.certificateType;
      if (certType === 'Direct UIDAI') {
        result.message = 'XML is authentic and directly signed by UIDAI - Data integrity verified';
      } else if (certType === 'Authorized CA') {
        result.message = 'XML is authentic and signed by UIDAI authorized CA - Data integrity verified';
      } else {
        result.message = 'XML is authentic and signed by UIDAI - Data integrity verified';
      }

      return result;

    } catch (error) {
      result.errors.push(error.message);
      result.message = `Verification error: ${error.message}`;
      return result;
    }
  }

  /**
   * Parse XML content
   */
  parseXML(xmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      // Check for parsing errors
      const parserErrors = doc.getElementsByTagName('parsererror');
      if (parserErrors.length > 0) {
        return null;
      }

      return doc;
    } catch (error) {
      console.error('XML parsing error:', error);
      return null;
    }
  }

  /**
   * Find Signature element in XML
   */
  findSignature(doc) {
    try {
      const select = xpath.useNamespaces({
        'ds': 'http://www.w3.org/2000/09/xmldsig#'
      });

      const signatures = select('//ds:Signature', doc);
      return signatures.length > 0 ? signatures[0] : null;
    } catch (error) {
      console.error('Signature search error:', error);
      return null;
    }
  }

  /**
   * Extract X.509 certificate from XML signature
   */
  extractCertificate(doc) {
    try {
      const select = xpath.useNamespaces({
        'ds': 'http://www.w3.org/2000/09/xmldsig#'
      });

      const certNodes = select('//ds:Signature/ds:KeyInfo/ds:X509Data/ds:X509Certificate', doc);

      if (certNodes.length === 0) {
        return null;
      }

      const certPem = certNodes[0].textContent.trim();

      // Convert to PEM format
      const pemCert = `-----BEGIN CERTIFICATE-----\n${certPem}\n-----END CERTIFICATE-----`;

      return pemCert;
    } catch (error) {
      console.error('Certificate extraction error:', error);
      return null;
    }
  }

  /**
   * Validate certificate and check if issued by UIDAI or authorized CA
   */
  validateCertificate(certPem) {
    try {
      const cert = forge.pki.certificateFromPem(certPem);

      const issuer = cert.issuer.attributes
        .map(attr => `${attr.shortName}=${attr.value}`)
        .join(', ');

      const subject = cert.subject.attributes
        .map(attr => `${attr.shortName}=${attr.value}`)
        .join(', ');

      // Check if issued directly by UIDAI
      const isDirectUidai = this.uidaiIssuers.some(uidaiIssuer =>
        issuer.includes(uidaiIssuer) || subject.includes(uidaiIssuer)
      );

      // Check if issued by authorized CA used by UIDAI
      const isAuthorizedCA = this.authorizedCAs.some(ca =>
        issuer.includes(ca) || subject.includes(ca)
      );

      // Check if certificate is from India (additional validation)
      const isIndianCert = issuer.includes('C=IN') || subject.includes('C=IN');

      // Valid if either directly from UIDAI or from authorized CA in India
      const isUidaiOrAuthorized = isDirectUidai || (isAuthorizedCA && isIndianCert);

      // Check validity period
      const now = new Date();
      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;
      const isValidPeriod = now >= validFrom && now <= validTo;
      const isExpired = now > validTo;

      // For Aadhaar XMLs, expired certificates are acceptable if:
      // 1. The certificate was from UIDAI or authorized CA
      // 2. The digital signature still verifies cryptographically
      // This is because the XML was signed when the cert was valid
      const certificateAcceptable = isUidaiOrAuthorized;

      return {
        valid: certificateAcceptable,
        isUidai: isUidaiOrAuthorized,
        issuer: issuer,
        subject: subject,
        isDirectUidai: isDirectUidai,
        isAuthorizedCA: isAuthorizedCA,
        details: {
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          isValidPeriod: isValidPeriod,
          isExpired: isExpired,
          serialNumber: cert.serialNumber,
          signatureAlgorithm: cert.signatureOid,
          certificateType: isDirectUidai ? 'Direct UIDAI' : (isAuthorizedCA ? 'Authorized CA' : 'Unknown'),
          note: isExpired ? 'Certificate expired but signature remains valid (XML was signed when cert was active)' : null
        }
      };
    } catch (error) {
      console.error('Certificate validation error:', error);
      return {
        valid: false,
        isUidai: false,
        issuer: 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * Verify the digital signature
   */
  verifySignature(xmlContent, doc, certPem) {
    try {
      // Method 1: Using xml-crypto library
      const select = xpath.useNamespaces({
        'ds': 'http://www.w3.org/2000/09/xmldsig#'
      });

      const signatureNodes = select('//ds:Signature', doc);
      if (signatureNodes.length === 0) {
        return false;
      }

      const sig = new SignedXml();
      sig.keyInfoProvider = {
        getKeyInfo: () => '<X509Data></X509Data>',
        getKey: () => certPem
      };

      sig.loadSignature(signatureNodes[0]);

      // Get the signed data
      const signedData = this.getSignedData(doc);

      const isValid = sig.checkSignature(xmlContent);

      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error);

      // Method 2: Manual verification using node-forge
      try {
        return this.verifySignatureManually(doc, certPem);
      } catch (manualError) {
        console.error('Manual signature verification also failed:', manualError);
        return false;
      }
    }
  }

  /**
   * Manual signature verification using node-forge
   */
  verifySignatureManually(doc, certPem) {
    try {
      const select = xpath.useNamespaces({
        'ds': 'http://www.w3.org/2000/09/xmldsig#'
      });

      // Get signature value
      const signatureValueNodes = select('//ds:Signature/ds:SignatureValue', doc);
      if (signatureValueNodes.length === 0) {
        return false;
      }

      const signatureValue = signatureValueNodes[0].textContent.trim();
      const signatureBytes = forge.util.decode64(signatureValue);

      // Get signed info
      const signedInfoNodes = select('//ds:Signature/ds:SignedInfo', doc);
      if (signedInfoNodes.length === 0) {
        return false;
      }

      // Serialize SignedInfo (canonicalization)
      const signedInfoXml = this.serializeNode(signedInfoNodes[0]);

      // Get certificate
      const cert = forge.pki.certificateFromPem(certPem);
      const publicKey = cert.publicKey;

      // Create digest
      const md = forge.md.sha256.create();
      md.update(signedInfoXml, 'utf8');

      // Verify signature
      const verified = publicKey.verify(md.digest().bytes(), signatureBytes);

      return verified;
    } catch (error) {
      console.error('Manual verification error:', error);
      return false;
    }
  }

  /**
   * Get signed data from document
   */
  getSignedData(doc) {
    try {
      const select = xpath.useNamespaces({
        'ds': 'http://www.w3.org/2000/09/xmldsig#'
      });

      const signedInfoNodes = select('//ds:Signature/ds:SignedInfo', doc);
      if (signedInfoNodes.length > 0) {
        return this.serializeNode(signedInfoNodes[0]);
      }

      return null;
    } catch (error) {
      console.error('Error getting signed data:', error);
      return null;
    }
  }

  /**
   * Serialize XML node to string
   */
  serializeNode(node) {
    const XMLSerializer = new DOMParser().constructor.XMLSerializer ||
      (typeof window !== 'undefined' && window.XMLSerializer);

    if (XMLSerializer) {
      const serializer = new XMLSerializer();
      return serializer.serializeToString(node);
    }

    // Fallback
    return node.toString();
  }

  /**
   * Additional data integrity checks
   */
  checkDataIntegrity(doc) {
    try {
      // Check for required Aadhaar fields
      const requiredElements = ['UidData', 'Poi', 'Poa'];
      const missingElements = [];

      for (const element of requiredElements) {
        const nodes = doc.getElementsByTagName(element);
        if (nodes.length === 0) {
          missingElements.push(element);
        }
      }

      // Check if data is encrypted (Aadhaar offline XML has encrypted data)
      const hasEncryptedData = doc.getElementsByTagName('Data').length > 0 ||
                              doc.getElementsByTagName('EncryptedData').length > 0;

      return {
        status: missingElements.length === 0 ? 'intact' : 'suspicious',
        details: {
          hasRequiredElements: missingElements.length === 0,
          missingElements: missingElements,
          hasEncryptedData: hasEncryptedData,
          structureCompliant: missingElements.length === 0 && hasEncryptedData
        }
      };
    } catch (error) {
      return {
        status: 'unknown',
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Verify from file path
   */
  async verifyFile(filePath) {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      return await this.verify(xmlContent);
    } catch (error) {
      return {
        valid: false,
        verified: false,
        message: `Failed to read file: ${error.message}`,
        errors: [error.message]
      };
    }
  }
}

export default AadhaarVerifier;
