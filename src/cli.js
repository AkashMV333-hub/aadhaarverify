#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import AadhaarVerifier from './verifier.js';
import StreamZip from 'node-stream-zip';
import * as zipjs from '@zip.js/zip.js';

const program = new Command();

program
  .name('aadhaar-verifier')
  .description('CLI tool to verify Aadhaar Offline eKYC XML files')
  .version('1.0.0');

program
  .option('-f, --file <path>', 'Path to Aadhaar XML file')
  .option('-p, --password <password>', 'Password for ZIP file (if required)')
  .option('-v, --verbose', 'Verbose output with detailed information')
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(chalk.blue.bold('\n🔐 Aadhaar XML Verifier\n'));

  // Check if file path is provided
  if (!options.file) {
    console.log(chalk.red('Error: No file specified'));
    console.log(chalk.yellow('\nUsage:'));
    console.log(chalk.white('  npm run verify -- --file path/to/aadhaar.xml'));
    console.log(chalk.white('  npm run verify -- -f path/to/aadhaar.xml --verbose\n'));
    process.exit(1);
  }

  const filePath = path.resolve(options.file);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`Error: File not found: ${filePath}\n`));
    process.exit(1);
  }

  // Check if file is XML
  const isZip = filePath.toLowerCase().endsWith('.zip');
  if (!filePath.toLowerCase().endsWith('.xml') && !isZip) {
    console.log(chalk.yellow('Warning: File does not have .xml or .zip extension\n'));
  }

  console.log(chalk.cyan(`Verifying: ${filePath}\n`));
  console.log(chalk.gray('━'.repeat(60)));

  try {
    const verifier = new AadhaarVerifier();

    let result;

    if (isZip) {
      // Extract XML from ZIP (first .xml entry) using provided password
      const password = options.password || '';
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);

        const reader = new zipjs.ZipReader(new zipjs.BlobReader(blob), { password });
        const entries = await reader.getEntries();
        const xmlEntry = entries.find((e) => e.filename && e.filename.toLowerCase().endsWith('.xml'));

        if (!xmlEntry) {
          await reader.close();
          console.log(chalk.red('Error: No XML file found inside ZIP'));
          process.exit(1);
        }

        const xmlText = await xmlEntry.getData(new zipjs.TextWriter());
        await reader.close();
        result = await verifier.verify(xmlText);
      } catch (err) {
        const msg = err && err.message ? err.message.toLowerCase() : '';
        if (msg.includes('encrypted') || msg.includes('password') || msg.includes('wrong password')) {
          console.log(chalk.red('Failed to extract ZIP: the archive or its entries are encrypted. Provide the correct password using --password.'));
        } else {
          console.log(chalk.red('Failed to extract ZIP:'), err.message || String(err));
        }
        process.exit(1);
      }
    } else {
      result = await verifier.verifyFile(filePath);
    }

    // Display results
    console.log('\n');

    if (result.verified) {
      console.log(chalk.green.bold('✓ VERIFICATION SUCCESSFUL\n'));
      console.log(chalk.green(result.message));
    } else {
      console.log(chalk.red.bold('✗ VERIFICATION FAILED\n'));
      console.log(chalk.red(result.message));
    }

    console.log(chalk.gray('\n━'.repeat(60)));
    console.log(chalk.white.bold('\nVerification Details:\n'));

    // Display details
    if (result.details) {
      const details = result.details;

      console.log(chalk.white('  Structure Valid:    ') +
        (details.structureValid ? chalk.green('✓ Yes') : chalk.red('✗ No')));

      console.log(chalk.white('  Has Signature:      ') +
        (details.hasSignature ? chalk.green('✓ Yes') : chalk.red('✗ No')));

      console.log(chalk.white('  Signature Valid:    ') +
        (details.signatureValid ? chalk.green('✓ Yes') : chalk.red('✗ No')));

      console.log(chalk.white('  Certificate Valid:  ') +
        (details.certificateValid ? chalk.green('✓ Yes') : chalk.red('✗ No')));

      console.log(chalk.white('  Data Integrity:     ') +
        (details.dataIntegrity === 'intact' ? chalk.green('✓ Intact') :
         details.dataIntegrity === 'compromised' ? chalk.red('✗ Compromised') :
         chalk.yellow('⚠ ' + details.dataIntegrity)));

      if (details.certificateIssuer) {
        console.log(chalk.white('\n  Certificate Issuer: ') +
          chalk.cyan(details.certificateIssuer));
      }

      // Verbose mode
      if (options.verbose && details.certificateDetails) {
        console.log(chalk.gray('\n━'.repeat(60)));
        console.log(chalk.white.bold('\nCertificate Details:\n'));

        const certDetails = details.certificateDetails;

        if (certDetails.subject) {
          console.log(chalk.white('  Subject:            ') + chalk.cyan(certDetails.subject));
        }

        if (certDetails.validFrom) {
          console.log(chalk.white('  Valid From:         ') + chalk.cyan(certDetails.validFrom));
        }

        if (certDetails.validTo) {
          console.log(chalk.white('  Valid To:           ') + chalk.cyan(certDetails.validTo));
        }

        if (certDetails.serialNumber) {
          console.log(chalk.white('  Serial Number:      ') + chalk.cyan(certDetails.serialNumber));
        }

        if (certDetails.signatureAlgorithm) {
          console.log(chalk.white('  Signature Algo:     ') + chalk.cyan(certDetails.signatureAlgorithm));
        }
      }

      if (options.verbose && details.integrityDetails) {
        console.log(chalk.gray('\n━'.repeat(60)));
        console.log(chalk.white.bold('\nIntegrity Check Details:\n'));

        const intDetails = details.integrityDetails;

        console.log(chalk.white('  Required Elements:  ') +
          (intDetails.hasRequiredElements ? chalk.green('✓ Present') : chalk.red('✗ Missing')));

        console.log(chalk.white('  Encrypted Data:     ') +
          (intDetails.hasEncryptedData ? chalk.green('✓ Present') : chalk.red('✗ Missing')));

        console.log(chalk.white('  Structure Compliant:') +
          (intDetails.structureCompliant ? chalk.green('✓ Yes') : chalk.red('✗ No')));

        if (intDetails.missingElements && intDetails.missingElements.length > 0) {
          console.log(chalk.white('\n  Missing Elements:   ') +
            chalk.red(intDetails.missingElements.join(', ')));
        }
      }
    }

    // Display errors
    if (result.errors && result.errors.length > 0) {
      console.log(chalk.gray('\n━'.repeat(60)));
      console.log(chalk.red.bold('\nErrors:\n'));

      result.errors.forEach((error, index) => {
        console.log(chalk.red(`  ${index + 1}. ${error}`));
      });
    }

    console.log(chalk.gray('\n━'.repeat(60)));
    console.log(chalk.gray(`\nTimestamp: ${result.timestamp}`));
    console.log('');

    // Exit with appropriate code
    process.exit(result.verified ? 0 : 1);

  } catch (error) {
    console.log(chalk.red.bold('\n✗ VERIFICATION ERROR\n'));
    console.log(chalk.red(error.message));
    console.log(chalk.gray('\n' + error.stack));
    console.log('');
    process.exit(1);
  }
}

main();
