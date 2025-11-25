
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_URL = 'https://raw.githubusercontent.com/ewanhowell5195/wynem/main/src/assets/json/cem_template_models.json';
const TARGET_DIR = path.resolve(__dirname, '../__mocks__/cem');

// Type definitions based on inspection
interface CEMModelEntry {
    model: string; // Stringified JSON
    texture_data?: string; // Base64 texture
    texture_name?: string;
    vanilla_textures?: string | string[];
}

interface EntityEntry {
    name: string;
    model?: string;
    variants?: (string | EntityEntry)[];
    type?: string; // 'heading'
}

interface Category {
    name: string;
    entities: (string | EntityEntry)[];
}

interface CEMData {
    version: string;
    categories: Category[];
    models: Record<string, CEMModelEntry>;
}

async function main() {
    console.log('🚀 Starting CEM Template Extractor...');

    if (!fs.existsSync(TARGET_DIR)) {
        console.log(`📂 Creating target directory: ${TARGET_DIR}`);
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    console.log(`📡 Fetching data from: ${DATA_URL}`);
    const response = await fetch(DATA_URL);

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CEMData;

    console.log(`📦 Loaded data version: ${data.version}`);

    let count = 0;
    let skipped = 0;

    // Helper to process an entity
    const processEntity = (entityName: string, modelKey: string) => {
        const modelEntry = data.models[modelKey];
        if (!modelEntry) {
            console.warn(`⚠️  Model not found for ${entityName} (key: ${modelKey})`);
            skipped++;
            return;
        }

        try {
            // Parse the inner JSON string
            const modelJson = JSON.parse(modelEntry.model);

            // Write to .jem file
            const filePath = path.join(TARGET_DIR, `${entityName}.jem`);
            fs.writeFileSync(filePath, JSON.stringify(modelJson, null, 2));
            // console.log(`✅ Wrote ${entityName}.jem`);
            process.stdout.write('.');
            count++;
        } catch (err) {
            console.error(`❌ Error parsing/writing ${entityName}:`, err);
            skipped++;
        }
    };

    // Iterate through categories
    for (const category of data.categories) {
        // console.log(`\nProcessing category: ${category.name}`);

        for (const entity of category.entities) {
            if (typeof entity === 'string') {
                // Simple string entry: name is the entity name, model key is the same
                processEntity(entity, entity);
            } else if (entity.type === 'heading') {
                continue;
            } else {
                // Object entry
                const entityName = entity.name;
                const modelKey = entity.model || entityName;

                processEntity(entityName, modelKey);

                // Process variants
                if (entity.variants) {
                    for (const variant of entity.variants) {
                        let variantName: string;
                        let variantModelKey: string;

                        if (typeof variant === 'string') {
                            variantName = variant;
                            variantModelKey = modelKey; // Inherit parent model key if just a string? 
                            // Wait, checking loader logic: 
                            // if (!category.entities[i].variants[j].model) {
                            //   category.entities[i].variants[j].model = category.entities[i].model ?? category.entities[i].name
                            // }
                            // So yes, it inherits.
                        } else {
                            variantName = variant.name;
                            variantModelKey = variant.model || modelKey;
                        }

                        // Only save variant if it has a different name than parent, 
                        // or if we want to be explicit.
                        // For mocks, let's save everything to be safe.
                        processEntity(variantName, variantModelKey);
                    }
                }
            }
        }
    }

    console.log(`\n\n🎉 Extraction complete!`);
    console.log(`✅ Created ${count} JEM files.`);
    console.log(`⚠️  Skipped ${skipped} entries.`);
}

main();
