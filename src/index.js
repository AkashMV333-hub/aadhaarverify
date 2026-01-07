import AadhaarVerifier from './verifier.js';

// Export the verifier for use as a module
export { AadhaarVerifier };
export default AadhaarVerifier;

// Example usage when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new AadhaarVerifier();

  console.log('Aadhaar XML Verifier Module');
  console.log('\nUsage:');
  console.log('  import AadhaarVerifier from "./verifier.js";');
  console.log('  const verifier = new AadhaarVerifier();');
  console.log('  const result = await verifier.verifyFile("path/to/file.xml");');
  console.log('\nOr use the CLI:');
  console.log('  npm run verify -- --file path/to/file.xml');
  console.log('\nOr start the web server:');
  console.log('  npm run server');
}
