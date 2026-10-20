import { seedGlobalOptionTemplates } from './src/services/optionTemplateService';

async function run() {
  console.log("Seeding templates...");
  const result = await seedGlobalOptionTemplates(false);
  console.log("Seeding result:", result);
}
run().catch(console.error);
