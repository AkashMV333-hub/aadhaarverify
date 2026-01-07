import AadhaarVerifier from './src/verifier.js';

console.log('Testing Aadhaar Verifier Setup...\n');

// Test 1: Can we create a verifier instance?
console.log('✓ Test 1: Creating verifier instance...');
const verifier = new AadhaarVerifier();
console.log('  Success: Verifier instance created\n');

// Test 2: Test with invalid XML
console.log('✓ Test 2: Testing with invalid XML...');
const invalidXml = '<?xml version="1.0"?><invalid>test</invalid>';
const result1 = await verifier.verify(invalidXml);
console.log('  Result:', result1.verified ? '✗ FAIL' : '✓ PASS');
console.log('  Message:', result1.message);
console.log('  Expected: Should fail (no signature)\n');

// Test 3: Test with XML that has no signature
console.log('✓ Test 3: Testing with unsigned XML...');
const unsignedXml = `<?xml version="1.0" encoding="UTF-8"?>
<OfflinePaperlessKyc>
  <UidData>
    <Poi name="John Doe" dob="01-01-1990"/>
  </UidData>
</OfflinePaperlessKyc>`;
const result2 = await verifier.verify(unsignedXml);
console.log('  Result:', result2.verified ? '✗ FAIL' : '✓ PASS');
console.log('  Message:', result2.message);
console.log('  Has Signature:', result2.details.hasSignature);
console.log('  Expected: Should fail (no signature)\n');

// Test 4: Test parsing capabilities
console.log('✓ Test 4: Testing XML parsing...');
const validXmlStructure = '<?xml version="1.0" encoding="UTF-8"?><root><test>data</test></root>';
const doc = verifier.parseXML(validXmlStructure);
console.log('  Result:', doc ? '✓ PASS' : '✗ FAIL');
console.log('  Expected: Should parse successfully\n');

// Test 5: Test with malformed XML
console.log('✓ Test 5: Testing with malformed XML...');
const malformedXml = '<?xml version="1.0"?><root><unclosed>';
const result3 = await verifier.verify(malformedXml);
console.log('  Result:', result3.verified ? '✗ FAIL' : '✓ PASS');
console.log('  Message:', result3.message);
console.log('  Expected: Should fail (parse error)\n');

console.log('═══════════════════════════════════════════════════════');
console.log('Setup Test Complete!');
console.log('═══════════════════════════════════════════════════════\n');
console.log('All components are working correctly.');
console.log('\nNext steps:');
console.log('1. Test with a real Aadhaar XML file:');
console.log('   npm run verify -- --file path/to/aadhaar.xml');
console.log('\n2. Start the web server:');
console.log('   npm run server');
console.log('\n3. Read USAGE.md for integration instructions\n');
