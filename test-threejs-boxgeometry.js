// Quick test to understand Three.js BoxGeometry face order
// Run this in Node.js with: node test-threejs-boxgeometry.js

const THREE = require('three');

// Create a simple box geometry
const geometry = new THREE.BoxGeometry(2, 3, 4); // width, height, depth

// Get UV attribute
const uvAttr = geometry.attributes.uv;

console.log("BoxGeometry created: width=2, height=3, depth=4");
console.log("Total UV vertices:", uvAttr.count);
console.log("Expected: 24 (6 faces × 4 vertices per face)");
console.log("");

// Print UV coordinates for each face
console.log("Face breakdown (4 vertices per face):");
for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
  console.log(`\nFace ${faceIndex}:`);
  for (let v = 0; v < 4; v++) {
    const vertexIndex = faceIndex * 4 + v;
    const u = uvAttr.getX(vertexIndex);
    const v_coord = uvAttr.getY(vertexIndex);
    console.log(`  Vertex ${v}: UV(${u.toFixed(2)}, ${v_coord.toFixed(2)})`);
  }
}

// Get position attribute to understand vertex order
const posAttr = geometry.attributes.position;
console.log("\n\nPosition breakdown:");
for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
  console.log(`\nFace ${faceIndex}:`);
  for (let v = 0; v < 4; v++) {
    const vertexIndex = faceIndex * 4 + v;
    const x = posAttr.getX(vertexIndex);
    const y = posAttr.getY(vertexIndex);
    const z = posAttr.getZ(vertexIndex);
    console.log(
      `  Vertex ${v}: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`,
    );
  }
}

// Print indices to understand winding order
console.log("\n\nIndex buffer (face winding order):");
const indexAttr = geometry.index;
if (indexAttr) {
  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    console.log(`\nFace ${faceIndex}:`);
    for (let i = 0; i < 6; i++) {
      const idx = indexAttr.getX(faceIndex * 6 + i);
      process.stdout.write(`  ${idx}`);
    }
    console.log("");
  }
}

// Identify which face is which by checking positions
console.log("\n\nFace identification:");
const faceNames = ["?", "?", "?", "?", "?", "?"];
for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
  // Get first vertex position to identify the face
  const v0_x = posAttr.getX(faceIndex * 4);
  const v0_y = posAttr.getY(faceIndex * 4);
  const v0_z = posAttr.getZ(faceIndex * 4);

  // Determine face based on which coordinate is constant
  if (Math.abs(v0_x - 1) < 0.01) faceNames[faceIndex] = "+X (East)";
  else if (Math.abs(v0_x + 1) < 0.01) faceNames[faceIndex] = "-X (West)";
  else if (Math.abs(v0_y - 1.5) < 0.01) faceNames[faceIndex] = "+Y (Up)";
  else if (Math.abs(v0_y + 1.5) < 0.01) faceNames[faceIndex] = "-Y (Down)";
  else if (Math.abs(v0_z - 2) < 0.01) faceNames[faceIndex] = "+Z (South)";
  else if (Math.abs(v0_z + 2) < 0.01) faceNames[faceIndex] = "-Z (North)";

  console.log(`Face ${faceIndex}: ${faceNames[faceIndex]}`);
}
