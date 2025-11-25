// Quick test to verify vanilla JEM loading from browser console
// Copy this into the browser console when the app is running

(async () => {
  console.log('Testing vanilla JEM loading...');

  try {
    // Import the loadEntityModel function
    const { loadEntityModel } = await import('./src/lib/emf/index.ts');

    // Try to load cow entity (without pack path, should fallback to vanilla)
    console.log('Loading cow entity model...');
    const cowModel = await loadEntityModel('cow');

    if (cowModel) {
      console.log('✅ SUCCESS: Cow model loaded from vanilla JEM!');
      console.log('Model details:', {
        parts: Object.keys(cowModel.parts).length,
        texturePath: cowModel.texturePath
      });
    } else {
      console.log('❌ FAILED: No model returned');
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
})();
