#!/usr/bin/env node
/**
 * Test script to validate all JEM entity models
 *
 * Tests both __mocks__/cem/ models and embedded vanilla models
 * to ensure the parser can handle all edge cases.
 */

const fs = require('fs');
const path = require('path');

// Statistics
const stats = {
  total: 0,
  parsed: 0,
  failed: 0,
  missingCoordinates: 0,
  emptyParts: 0,
  partWithoutBoxes: 0,
  negativeUVs: 0,
  perBoxTextureSize: 0,
  errors: []
};

/**
 * Simulate the parseJEM function logic to validate files
 */
function testParseJEM(jemData, entityType, filePath) {
  try {
    const textureSize = jemData.textureSize || [64, 32];
    const models = jemData.models || [];

    let totalBoxes = 0;
    let boxesWithCoords = 0;
    let emptyPartCount = 0;
    let perBoxTextureSizeCount = 0;
    let negativeUVCount = 0;

    function processModelPart(part, depth = 0) {
      const partName = part.part || part.id || 'unnamed';
      const boxes = part.boxes || [];
      const submodels = part.submodels || [];
      const submodel = part.submodel ? [part.submodel] : [];
      const children = [...submodels, ...submodel];

      totalBoxes += boxes.length;

      // Check if part is empty
      if (boxes.length === 0 && children.length === 0) {
        emptyPartCount++;
      }

      // Process boxes
      for (const box of boxes) {
        if (box.coordinates) {
          boxesWithCoords++;
        }

        if (box.textureSize) {
          perBoxTextureSizeCount++;
        }

        // Check for negative UV offsets
        if (box.textureOffset) {
          const [u, v] = box.textureOffset;
          if (u < 0 || v < 0) {
            negativeUVCount++;
          }
        }
      }

      // Process children recursively
      for (const child of children) {
        processModelPart(child, depth + 1);
      }
    }

    for (const model of models) {
      processModelPart(model);
    }

    const result = {
      success: true,
      totalBoxes,
      boxesWithCoords,
      boxesMissingCoords: totalBoxes - boxesWithCoords,
      emptyParts: emptyPartCount,
      perBoxTextureSize: perBoxTextureSizeCount,
      negativeUVs: negativeUVCount,
    };

    // Update global stats
    stats.parsed++;
    if (result.boxesMissingCoords > 0) stats.missingCoordinates++;
    if (result.emptyParts > 0) stats.emptyParts++;
    if (result.perBoxTextureSize > 0) stats.perBoxTextureSize++;
    if (result.negativeUVs > 0) stats.negativeUVs++;

    return result;

  } catch (error) {
    stats.failed++;
    stats.errors.push({
      file: filePath,
      entityType,
      error: error.message
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test all JEM files in a directory
 */
function testDirectory(dirPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${label}: ${dirPath}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(dirPath)) {
    console.log(`❌ Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.jem') || f.endsWith('.jem.json'))
    .sort();

  console.log(`Found ${files.length} JEM files\n`);

  const results = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const entityType = path.basename(file, path.extname(file)).replace('.jem', '');

    stats.total++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const jemData = JSON.parse(content);
      const result = testParseJEM(jemData, entityType, filePath);

      results.push({
        file,
        entityType,
        ...result
      });

      // Print result
      if (result.success) {
        const issues = [];
        if (result.boxesMissingCoords > 0) {
          issues.push(`⚠️  ${result.boxesMissingCoords}/${result.totalBoxes} boxes missing coords`);
        }
        if (result.emptyParts > 0) {
          issues.push(`📦 ${result.emptyParts} empty parts`);
        }
        if (result.perBoxTextureSize > 0) {
          issues.push(`🎨 ${result.perBoxTextureSize} per-box textureSizes`);
        }
        if (result.negativeUVs > 0) {
          issues.push(`➖ ${result.negativeUVs} negative UVs`);
        }

        if (issues.length > 0) {
          console.log(`⚡ ${entityType.padEnd(30)} - ${issues.join(', ')}`);
        } else {
          console.log(`✅ ${entityType.padEnd(30)} - OK (${result.totalBoxes} boxes)`);
        }
      } else {
        console.log(`❌ ${entityType.padEnd(30)} - FAILED: ${result.error}`);
      }

    } catch (error) {
      stats.total++;
      stats.failed++;
      stats.errors.push({
        file: filePath,
        entityType,
        error: error.message
      });
      console.log(`❌ ${entityType.padEnd(30)} - PARSE ERROR: ${error.message}`);
    }
  }

  return results;
}

/**
 * Main test execution
 */
function main() {
  console.log('🧪 Entity Model Test Suite');
  console.log('Testing JEM parser robustness\n');

  const projectRoot = path.resolve(__dirname, '..');

  // Test embedded vanilla models
  const vanillaDir = path.join(projectRoot, 'src/lib/emf/vanilla');
  const vanillaResults = testDirectory(vanillaDir, 'Embedded Vanilla Models');

  // Test __mocks__/cem models
  const mocksDir = path.join(projectRoot, '__mocks__/cem');
  const mocksResults = testDirectory(mocksDir, 'Vanilla Mocks (__mocks__/cem)');

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files tested: ${stats.total}`);
  console.log(`Successfully parsed: ${stats.parsed} (${((stats.parsed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Failed to parse: ${stats.failed}`);
  console.log();
  console.log('Issue Breakdown:');
  console.log(`  - Files with missing coordinates: ${stats.missingCoordinates}`);
  console.log(`  - Files with empty parts: ${stats.emptyParts}`);
  console.log(`  - Files with per-box textureSize: ${stats.perBoxTextureSize}`);
  console.log(`  - Files with negative UVs: ${stats.negativeUVs}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Parse Errors (${stats.errors.length}):`);
    stats.errors.forEach(err => {
      console.log(`  - ${err.entityType}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Determine exit code
  const exitCode = stats.failed > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('⚠️  Some tests failed - see errors above');
  }

  console.log('='.repeat(60) + '\n');

  // Write detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    vanillaResults,
    mocksResults: mocksResults ? mocksResults.slice(0, 20) : [] // First 20 for brevity
  };

  const reportPath = path.join(projectRoot, 'entity-model-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report written to: ${reportPath}\n`);

  process.exit(exitCode);
}

// Run tests
main();
