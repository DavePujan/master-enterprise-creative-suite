import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No DATABASE_URL found');
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL database for campaign seeding...');

  const workspaceId = 'a1b3967b-0545-46fc-944b-d55bc420af29';
  const userId = '4c18399a-85aa-465e-abe2-5a48d1e12527';

  // 1. Seed Strategy 1: Big Billion Days 2026 — Luck Badal Sakta Hai (Stage 5/5 with AdSpec)
  const strat1Res = await client.query(`
    INSERT INTO public.campaign_strategies (
      workspace_id, created_by, title, status, framework_id, created_at, updated_at
    ) VALUES (
      $1, $2, 'Big Billion Days 2026 — Luck Badal Sakta Hai', 'active', 'SEASONAL-FESTIVE-EMOTIONAL-HOMECOMING',
      NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'
    ) RETURNING id;
  `, [workspaceId, userId]);

  const strat1Id = strat1Res.rows[0].id;

  const ver1Res = await client.query(`
    INSERT INTO public.campaign_strategy_versions (
      campaign_strategy_id, version_number, selected_territory, master_strategy, downstream_briefs, created_by, created_at
    ) VALUES (
      $1, 1,
      $2, $3, $4, $5, NOW() - INTERVAL '30 minutes'
    ) RETURNING id;
  `, [
    strat1Id,
    JSON.stringify({
      id: 'terr_bbd_luck',
      name: 'Luck Badal Sakta Hai',
      angle: 'Emotional Homecoming & Reversal of Fortune',
      premise: 'A poignant tale of transforming everyday fortune and family reconnection through India’s biggest festive celebration.',
      theMechanism: 'Dignified festive access and unprecedented value for every Indian household.',
      creativeWorld: 'Warm festive twilight, vibrant hometown arrivals, relatable everyday victories.',
      whyNow: 'Festive shopping is no longer transactional—it is an emotional assertion of self-worth.',
      targetPillars: ['Family Pride', 'Festive Joy', 'Economic Empowerment'],
      estimatedRiskTier: 'moderate',
      fitScores: { brandVoice: 9.2, marketNovelty: 8.8, feasibility: 9.5, strategicRisk: 2.1 }
    }),
    JSON.stringify({
      bigIdea: 'Flipkart Big Billion Days: Jahan Kismat Nahi, Mehnat Ka Inaam Milta Hai.',
      executiveSummary: {
        coreConcept: 'Luck Badal Sakta Hai — festive fortune democratized across Bharat.',
        commercialRationale: 'Positions Flipkart as the compassionate enabler of Indian family milestones.'
      },
      creativeTension: 'Tension between aspiring for high-end lifestyle products and conservative festive budgeting.',
      narrativeSpine: 'From hesitant wishlists to unapologetic homecoming celebrations.'
    }),
    JSON.stringify({
      canonicalAdSpec: {
        id: 'adspec_bbd_2026_01',
        title: 'BBD 2026 Hero Campaign',
        aspectRatio: '16:9',
        targetDurationSec: 60,
        assets: [
          { type: 'hero_film', resolution: '4K', format: 'cinematic' },
          { type: 'digital_bumper', resolution: '1080x1920', format: '9:16' }
        ]
      },
      channelBriefs: [
        { channel: 'YouTube Hero Film', objective: 'Brand Recall & Emotional Resonance' },
        { channel: 'Meta & Instagram Reels', objective: 'Product Discovery & FOMO' },
        { channel: 'Performance Flywheel', objective: 'App Install & Cart Conversions' }
      ]
    }),
    userId
  ]);

  // Update current_version_id
  await client.query(`
    UPDATE public.campaign_strategies
    SET current_version_id = $1
    WHERE id = $2;
  `, [ver1Res.rows[0].id, strat1Id]);

  console.log('Seeded Strategy 1 (Stage 5/5):', strat1Id);

  // 2. Seed Strategy 2: Flipkart Big Billion Days: Bharat Ka Tyohaar (Stage 4/5)
  const strat2Res = await client.query(`
    INSERT INTO public.campaign_strategies (
      workspace_id, created_by, title, status, framework_id, created_at, updated_at
    ) VALUES (
      $1, $2, 'Flipkart Big Billion Days: Bharat Ka Tyohaar', 'active', 'MEME-SUBCULTURE',
      NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'
    ) RETURNING id;
  `, [workspaceId, userId]);

  const strat2Id = strat2Res.rows[0].id;

  const ver2Res = await client.query(`
    INSERT INTO public.campaign_strategy_versions (
      campaign_strategy_id, version_number, selected_territory, master_strategy, downstream_briefs, created_by, created_at
    ) VALUES (
      $1, 1,
      $2, $3, $4, $5, NOW() - INTERVAL '3 hours'
    ) RETURNING id;
  `, [
    strat2Id,
    JSON.stringify({
      id: 'terr_bbd_bharat',
      name: 'Bharat Ka Asli Tyohaar',
      angle: 'Cultural Unity & Collective Celebration',
      premise: 'How 1.4 billion aspirations unite during festive weeks across pin codes.',
      whyNow: 'Tier 2 and Tier 3 cities driving 68% of e-commerce festive growth.',
      fitScores: { brandVoice: 9.4, marketNovelty: 8.5, feasibility: 9.6, strategicRisk: 1.8 }
    }),
    JSON.stringify({
      bigIdea: 'Bharat Ka Tyohaar: Har Pincode Par Diwali Ki Pehli Roshni.',
      executiveSummary: {
        coreConcept: 'Democratizing premium technology and festive lifestyle across non-metro India.'
      },
      creativeTension: 'The gap between metro exclusivity and Bharat’s unyielding ambition.'
    }),
    JSON.stringify({}),
    userId
  ]);

  await client.query(`
    UPDATE public.campaign_strategies
    SET current_version_id = $1
    WHERE id = $2;
  `, [ver2Res.rows[0].id, strat2Id]);

  console.log('Seeded Strategy 2 (Stage 4/5):', strat2Id);

  // 3. Seed Strategy 3: Flipkart Mega Electronics: Upgrade Without Guilt (Stage 4/5)
  const strat3Res = await client.query(`
    INSERT INTO public.campaign_strategies (
      workspace_id, created_by, title, status, framework_id, created_at, updated_at
    ) VALUES (
      $1, $2, 'Flipkart Mega Electronics: Upgrade Without Guilt', 'active', 'PERFORMANCE-FLYWHEEL-CONVERSION',
      NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
    ) RETURNING id;
  `, [workspaceId, userId]);

  const strat3Id = strat3Res.rows[0].id;

  const ver3Res = await client.query(`
    INSERT INTO public.campaign_strategy_versions (
      campaign_strategy_id, version_number, selected_territory, master_strategy, downstream_briefs, created_by, created_at
    ) VALUES (
      $1, 1,
      $2, $3, $4, $5, NOW() - INTERVAL '1 day'
    ) RETURNING id;
  `, [
    strat3Id,
    JSON.stringify({
      id: 'terr_upgrade_guilt',
      name: 'Upgrade Without Guilt',
      angle: 'Rational Justification & High-Ticket Freedom',
      premise: 'Empowering young professionals and creators to upgrade their work tools without financial anxiety.',
      whyNow: 'Laptops, smartphones, and noise-cancelling headphones are productivity assets, not frivolous luxuries.',
      fitScores: { brandVoice: 8.9, marketNovelty: 9.1, feasibility: 9.2, strategicRisk: 2.4 }
    }),
    JSON.stringify({
      bigIdea: 'Kharcha Nahi, Investment Hai: Upgrade Your Everyday Productivity.',
      executiveSummary: {
        coreConcept: 'Shifting perception from consumer spending to self-investment.'
      },
      creativeTension: 'The friction between wanting pro gear and guilt over upgrade cycles.'
    }),
    JSON.stringify({}),
    userId
  ]);

  await client.query(`
    UPDATE public.campaign_strategies
    SET current_version_id = $1
    WHERE id = $2;
  `, [ver3Res.rows[0].id, strat3Id]);

  console.log('Seeded Strategy 3 (Stage 4/5):', strat3Id);

  await client.end();
  console.log('Database seeding completed successfully!');
}

seed().catch(console.error);
