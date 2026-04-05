const Database = require('better-sqlite3');
const { join } = require('path');

// Simple test of the SQLite database
const dbPath = join(__dirname, 'database/models.db');
const db = new Database(dbPath);

console.log('🗄️  Testing SQLite Model Database\n');

try {
  // Test providers
  console.log('📋 Providers:');
  const providers = db.prepare('SELECT * FROM providers ORDER BY provider_name').all();
  providers.forEach((p) => {
    console.log(
      `  ${p.provider_name} (${p.provider_id}) - API Key: ${p.api_key.substring(0, 10)}...`
    );
  });

  // Test models with provider info
  console.log('\n🤖 Models:');
  const models = db
    .prepare(
      `
    SELECT m.*, p.provider_id, p.provider_name 
    FROM models m 
    JOIN providers p ON m.provider_api_key = p.api_key 
    ORDER BY p.provider_name, m.model_name
  `
    )
    .all();

  models.forEach((m) => {
    const toolIcon = m.tool_support ? '🔧' : '  ';
    const cost = m.cost_per_token > 0 ? `$${m.cost_per_token}/1K` : 'Free';
    console.log(`  ${m.provider_name}: ${m.model_name} ${toolIcon} ${cost}`);
  });

  // Test OpenAI models specifically
  console.log('\n🔍 OpenAI Models:');
  const openaiModels = db
    .prepare(
      `
    SELECT m.*, p.provider_id, p.provider_name 
    FROM models m 
    JOIN providers p ON m.provider_api_key = p.api_key 
    WHERE p.provider_id = 'openai'
    ORDER BY m.model_name
  `
    )
    .all();

  openaiModels.forEach((m) => {
    console.log(`  ${m.model_name} (${m.model_id}) - ${m.max_tokens} tokens`);
  });

  // Test search functionality
  console.log('\n🔎 Search for "Claude":');
  const claudeModels = db
    .prepare(
      `
    SELECT m.*, p.provider_id, p.provider_name 
    FROM models m 
    JOIN providers p ON m.provider_api_key = p.api_key 
    WHERE m.model_name LIKE ? OR m.model_id LIKE ? OR p.provider_name LIKE ?
    ORDER BY p.provider_name, m.model_name
  `
    )
    .all('%Claude%', '%Claude%', '%Claude%');

  claudeModels.forEach((m) => {
    console.log(`  ${m.provider_name}: ${m.model_name}`);
  });

  console.log('\n✅ Database test completed successfully!');
  console.log(`📊 Database contains ${providers.length} providers and ${models.length} models`);
} catch (error) {
  console.error('❌ Database test failed:', error);
} finally {
  db.close();
}
