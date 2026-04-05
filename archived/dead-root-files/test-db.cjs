const { modelDB } = require('./dist/model-database.cjs');

console.log('🗄️  Testing SQLite Model Database\n');

try {
  // Test providers
  console.log('📋 Providers:');
  const providers = modelDB.getProviders();
  providers.forEach((p) => {
    console.log(
      `  ${p.provider_name} (${p.provider_id}) - API Key: ${p.api_key.substring(0, 10)}...`
    );
  });

  // Test models
  console.log('\n🤖 Models:');
  const models = modelDB.getProviderModels();
  models.forEach((m) => {
    const toolIcon = m.tool_support ? '🔧' : '  ';
    const cost = m.cost_per_token > 0 ? `$${m.cost_per_token}/1K` : 'Free';
    console.log(`  ${m.provider_name}: ${m.model_name} ${toolIcon} ${cost}`);
  });

  // Test specific provider models
  console.log('\n🔍 OpenAI Models:');
  const openaiModels = modelDB.getModelsByProviderId('openai');
  openaiModels.forEach((m) => {
    console.log(`  ${m.model_name} (${m.model_id}) - ${m.max_tokens} tokens`);
  });

  // Test search
  console.log('\n🔎 Search for "Claude":');
  const claudeModels = modelDB.searchModels('Claude');
  claudeModels.forEach((m) => {
    console.log(`  ${m.provider_name}: ${m.model_name}`);
  });

  console.log('\n✅ Database test completed successfully!');
} catch (error) {
  console.error('❌ Database test failed:', error);
} finally {
  modelDB.close();
}
