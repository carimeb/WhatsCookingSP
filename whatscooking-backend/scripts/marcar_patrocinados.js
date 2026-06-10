/**
 * Marca uma amostra de restaurantes como "patrocinados", adicionando:
 *   - sponsored: true            → flag para o frontend (badge futuro)
 *   - sponsored_boost: 5         → multiplicador usado pelo function score
 *
 * O script é IDEMPOTENTE: pode rodar quantas vezes quiser — ele sempre
 * limpa as marcações anteriores antes de aplicar as novas.
 *
 * A amostra é DETERMINÍSTICA (a cada N restaurantes ordenados por nome),
 * garantindo que a demo seja reproduzível: qualquer pessoa que clonar o
 * repo e rodar o script marca os mesmos restaurantes.
 *
 * Como rodar (de dentro de whatscooking-backend/, que já tem o driver e o .env):
 *   node scripts/marcar_patrocinados.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const QUANTOS = 15;  // quantos restaurantes patrocinar
const BOOST = 5;     // multiplicador do score

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI não encontrada. Rode de dentro de whatscooking-backend/');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const col = client.db('whatscooking').collection('restaurants');

    // 1. Limpa marcações anteriores (idempotência)
    const limpeza = await col.updateMany(
      { sponsored: { $exists: true } },
      { $unset: { sponsored: '', sponsored_boost: '' } }
    );
    if (limpeza.modifiedCount > 0) {
      console.log(`🧹 ${limpeza.modifiedCount} marcações anteriores removidas`);
    }

    // 2. Amostra determinística: ordena por nome e pega a cada N
    const total = await col.countDocuments();
    if (total === 0) {
      console.error('❌ Coleção vazia. Importe o dataset primeiro (ver README).');
      process.exit(1);
    }
    const passo = Math.max(1, Math.floor(total / QUANTOS));

    const todos = await col.find({})
      .sort({ name: 1 })
      .project({ _id: 1, name: 1, cuisine: 1, borough: 1 })
      .toArray();

    const escolhidos = todos.filter((_, i) => i % passo === 0).slice(0, QUANTOS);

    // 3. Aplica a marcação
    const r = await col.updateMany(
      { _id: { $in: escolhidos.map(d => d._id) } },
      { $set: { sponsored: true, sponsored_boost: BOOST } }
    );

    console.log(`\n✅ ${r.modifiedCount} restaurantes marcados como patrocinados (boost ×${BOOST}):\n`);
    escolhidos.forEach(d =>
      console.log(`   ⭐ ${d.name}  (${d.cuisine ?? '—'} · ${d.borough ?? '—'})`)
    );
    console.log('\n💡 Guarde alguns desses nomes — você vai usá-los para testar o boost na Etapa 3.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    if (err.message.includes('ENETUNREACH')) {
      console.error('   ↳ O cluster Atlas pode estar pausado. Verifique no Atlas UI e resume-o.');
    }
    process.exit(1);
  } finally {
    await client.close();
  }
})();
