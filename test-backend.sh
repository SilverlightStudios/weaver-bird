#!/bin/bash
# Test the vanilla JEM backend loading

echo "Testing vanilla JEM backend..."
echo ""

# Change to the project root
cd "$(dirname "$0")"

# Check if cow.jem exists
if [ -f "__mocks__/cem/cow.jem" ]; then
    echo "✅ cow.jem exists at __mocks__/cem/cow.jem"
    echo "File size: $(wc -c < __mocks__/cem/cow.jem) bytes"
else
    echo "❌ cow.jem NOT FOUND at __mocks__/cem/cow.jem"
    exit 1
fi

echo ""
echo "Available vanilla JEM files:"
ls -lh __mocks__/cem/*.jem | awk '{print "  - " $9 " (" $5 ")"}'

echo ""
echo "✅ Backend files are in place"
echo ""
echo "To test the full flow:"
echo "1. Run 'npm run dev'"
echo "2. Open the app and navigate to Entity Textures"
echo "3. Click on a cow texture"
echo "4. Check browser console for these logs:"
echo "   - '[EMF] Loading entity model: cow'"
echo "   - '[EMF] Looking for vanilla JEM: cow'"
echo "   - '[read_vanilla_jem] Reading vanilla JEM: __mocks__/cem/cow.jem'"
echo "   - '[EMF] ✓ Vanilla JEM loaded successfully'"
echo "5. The cow should render with the vanilla model (not a gray cube)"
