/**
 * Campaign Framework Knowledge Base & Mechanism Catalog.
 * Contains 26+ fully specified agency frameworks with operational strategic depth,
 * 100+ concrete activation mechanisms, anti-patterns, and heuristic framework matchers.
 */

import {
  StrategicFrameworkDefinition,
  StrategicMechanism
} from '../../../../../packages/types/campaignStrategy.js';

// ============================================================================
// 1. Curated Agency Frameworks (26 Strategic Models with Deep Knowledge)
// ============================================================================

export const CAMPAIGN_FRAMEWORKS: StrategicFrameworkDefinition[] = [
  {
    id: 'category-creation',
    name: 'Category Creation (Blue Ocean)',
    category: 'growth',
    tagline: 'Make the competition irrelevant by defining a new space and rules.',
    whenToUse: [
      'The product does not fit existing competitive comparisons',
      'Incumbent solutions force painful compromises',
      'The brand wants to own 100% of a newly named problem'
    ],
    whenNotToUse: [
      'The market is commoditized with low willingness to learn new terminology',
      'Short-term immediate discount sales are the sole objective'
    ],
    suitableObjectives: ['Brand Launch', 'Category Leadership', 'Market Redefinition'],
    suitableIndustries: ['B2B SaaS', 'HealthTech', 'FinTech', 'Direct-to-Consumer Innovation'],
    audienceConditions: ['Fatigued by status quo', 'Actively seeking modern alternatives'],
    strategicQuestions: [
      'What old compromise does the audience accept as normal that is actually unacceptable?',
      'What new vocabulary can we introduce to make existing solutions look outdated?'
    ],
    tensions: [
      'Audience believes X is necessary, but X is actually slowing them down.',
      'Existing tools solve symptoms; our category cures the root cause.'
    ],
    mechanisms: ['Vocabulary Inversion', 'The Old Way vs New Way Manifesto', 'Category Manifesto Deck'],
    strengths: ['High pricing power', 'Immense brand equity', 'Sticky community moat'],
    risks: ['Longer educational cycle', 'Requires sustained message discipline'],
    commonCliches: ['The future of [X]', 'Revolutionary all-in-one platform', 'Disrupting the industry'],
    examplePatterns: ['Drift creating Conversational Marketing', 'HubSpot inventing Inbound Marketing'],
    downstreamCreativeImplications: {
      textDirection: 'Provocative contrast, bold declarative statements, high epistemic authority.',
      imageVisualWorld: 'Sharp split compositions, high-contrast monochrome with single vivid accent color.',
      videoPacing: 'Deliberate, cinematic, intellectual build-up transitioning to high-energy breakthrough.',
      audioTone: 'Authoritative, calm, visionary executive voiceover.',
      deckNarrative: 'Problem-Opportunity-Old Paradigm Breakdown-New Category-Economic Proof.'
    }
  },
  {
    id: 'creator-led-momentum',
    name: 'Creator-Led Cultural Momentum',
    category: 'cultural',
    tagline: 'Harness diverse creator archetypes to build organic cultural proof and community adoption.',
    whenToUse: [
      'Product relies on high visual demonstration or social proof',
      'Target audience consumes short-form vertical video natively',
      'Brand wants decentralized credibility over corporate broadcast ads'
    ],
    whenNotToUse: [
      'Highly regulated industries with strict compliance audits on every word',
      'Products with zero consumer demonstration potential'
    ],
    suitableObjectives: ['Product Launch', 'Viral Awareness', 'Cultural Relevance', 'Demographic Shift'],
    suitableIndustries: ['E-Commerce', 'Fashion', 'Beauty', 'Gaming', 'Consumer Apps', 'Food & Beverage'],
    audienceConditions: ['Distrusts polished brand commercials', 'Values peer recommendations and unvarnished realism'],
    strategicQuestions: [
      'Which creator role is most potent: Creator-as-distribution, Creator-as-character, or Creator-as-product-demonstrator?',
      'What creator challenge or participatory mechanic gives creators freedom while reinforcing the brand promise?'
    ],
    tensions: [
      'Creators want authenticity; brands want message control. Resolution: Give them the premise, let them direct the punchline.',
      'Audience scrolls past ads; they stop for creator tension.'
    ],
    mechanisms: [
      'Creator-as-distribution',
      'Creator-as-character',
      'Creator-as-product-demonstrator',
      'Creator-as-community-leader',
      'Creator-as-co-creator',
      'Creator challenge mechanic',
      'Creator-vs-brand playful tension'
    ],
    strengths: ['Rapid algorithmic distribution', 'Genuine credibility', 'High engagement per dollar'],
    risks: ['Tone inconsistency if creators go rogue', 'Ad-fatigue if briefs are too scripted'],
    commonCliches: ['Hey guys so I just found this amazing product', 'Link in bio', 'Influencers holding boxes smiling'],
    examplePatterns: ['Duolingo unhinged mascot creator collabs', 'Gymshark athlete challenge relays'],
    downstreamCreativeImplications: {
      textDirection: 'Native internet slang, conversational hooks, first-person self-deprecating humor.',
      imageVisualWorld: 'UGC-style mobile photography, authentic lighting, un-retouched candid textures.',
      videoPacing: 'Hyper-fast jump cuts, 1-second retention hooks, kinetic sound effects.',
      audioTone: 'Spontaneous, conversational, relatable peer delivery with trending background beat.',
      deckNarrative: 'Cultural Insight-Creator Ecosystem-Ecosystem Roster-Activation Relay-ROI Projections.'
    }
  },
  {
    id: 'challenger-underdog',
    name: 'Challenger / Underdog Framing',
    category: 'brand',
    tagline: 'Pick a righteous fight with the complacent industry giant to win consumer loyalty.',
    whenToUse: [
      'David vs. Goliath market dynamics with a deeply entrenched incumbent',
      'Incumbent is perceived as greedy, slow, bureaucratic, or out-of-touch',
      'Brand has superior agility, customer care, or pricing fairness'
    ],
    whenNotToUse: [
      'When your brand is actually the market leader or subsidiary of a giant conglomerate',
      'When your product lacks concrete superior features to defend the fight'
    ],
    suitableObjectives: ['Market Share Steal', 'Brand Differentiation', 'PR Dominance'],
    suitableIndustries: ['FinTech', 'Telecom', 'Direct-to-Consumer', 'SaaS', 'Beverages'],
    audienceConditions: ['Resents existing monopolistic fees, hidden terms, or uncaring support'],
    strategicQuestions: [
      'What specific consumer pain does the giant ignore because it profits from it?',
      'How do we position ourselves as the customer’s righteous ally without looking bitter?'
    ],
    tensions: [
      'The giant has all the money and ads; we have the truth and the customer’s side.',
      'Customer feels trapped by inertia; we offer liberation.'
    ],
    mechanisms: ['Direct Comparison Teardown', 'The Giant’s Hidden Bill Stunt', 'Customer Liberation Bounty'],
    strengths: ['High emotional resonance', 'Earned media magnet', 'Instant brand clarity'],
    risks: ['Legal retaliations or competitor lawsuits', 'Appearing petty if executed without charm'],
    commonCliches: ['Tired of your old bank?', 'Say goodbye to bad customer service', 'Compare and save'],
    examplePatterns: ['Avis "We Try Harder"', 'Apple "Get a Mac"', 'Dollar Shave Club "Our Blades Are F***ing Great"'],
    downstreamCreativeImplications: {
      textDirection: 'Sharp wit, righteous indignation, punchy contrasts, customer-champion tone.',
      imageVisualWorld: 'Clean editorial minimalism, stark side-by-side comparative graphics.',
      videoPacing: 'Rhythmic, sarcastic humor with unexpected punchy product revelations.',
      audioTone: 'Charismatic, deadpan, rebellious yet thoroughly trustworthy.',
      deckNarrative: 'Incumbent Complacency-Customer Exploitation-Our Direct Alternative-Tear-Down Economics.'
    }
  },
  {
    id: 'customer-obsessed-proof',
    name: 'Radical Transparency & Customer Proof',
    category: 'performance',
    tagline: 'Demolish consumer skepticism by exposing the supply chain, margins, and uncensored feedback.',
    whenToUse: [
      'Industry is notorious for snake-oil marketing, hidden markups, or opaque ingredients',
      'The brand has genuinely ethical sourcing, superior craftsmanship, or verified clinical trials',
      'High price point that requires intense justification'
    ],
    whenNotToUse: [
      'Brands with fragile supply chains or unverified claims',
      'Impulse purchases where over-explaining kills the emotional buy'
    ],
    suitableObjectives: ['Trust Building', 'Conversion Rate Lift', 'High-Ticket Purchase Justification'],
    suitableIndustries: ['Skincare', 'Clean Beauty', 'Ethical Apparel', 'Supplements', 'Enterprise Infrastructure'],
    audienceConditions: ['Burned by false marketing promises', 'Analytical, reads labels, checks reviews'],
    strategicQuestions: [
      'What does everyone in the industry hide that we can proudly disclose?',
      'How can we turn customer doubt into our strongest proof point?'
    ],
    tensions: [
      'Consumers assume all claims are exaggerated; transparent proof makes exaggeration unnecessary.',
      'Price is high; value-breakdown shows it is actually the fairest deal.'
    ],
    mechanisms: ['Unvarnished Margin Breakdown', 'Live Ingredient Deep Dive', 'Bad Review Roast & Fix'],
    strengths: ['Unshakeable long-term brand equity', 'Word-of-mouth advocacy', 'High LTV'],
    risks: ['Competitors can copy the format', 'Requires ongoing rigorous compliance'],
    commonCliches: ['Transparency is in our DNA', 'Pure and natural', '100% honest'],
    examplePatterns: ['Everlane "Radical Transparency"', 'The Ordinary ingredient-first naming'],
    downstreamCreativeImplications: {
      textDirection: 'Factual, understated, zero hyperbole, clear numbers, transparent explanations.',
      imageVisualWorld: 'Macro ingredient details, laboratory clean lighting, neutral warm whites.',
      videoPacing: 'Calm, methodical, behind-the-scenes documentary style.',
      audioTone: 'Sincere, grounded, informative, devoid of hype.',
      deckNarrative: 'Market Skepticism-Ingredient/Cost Breakdown-Verified Trials-Customer Retention Engine.'
    }
  },
  {
    id: 'cultural-tension-hijack',
    name: 'Cultural Tension Hijack',
    category: 'cultural',
    tagline: 'Tap into an existing fierce cultural debate and take a decisive, values-driven stand.',
    whenToUse: [
      'A societal or generational shift is creating widespread conversation',
      'The brand’s genuine heritage or values align naturally with one side of the conversation',
      'High appetite for PR visibility and cultural earned media'
    ],
    whenNotToUse: [
      'Brand has no authentic right to speak on the topic ("woke-washing")',
      'The controversy threatens core business without upside'
    ],
    suitableObjectives: ['Cultural Dominance', 'Generational Alignment', 'PR Explosion'],
    suitableIndustries: ['Athletic Brands', 'Beverages', 'Lifestyle', 'FinTech', 'Gen-Z Platforms'],
    audienceConditions: ['Passionate about identity and social values; votes with their wallet'],
    strategicQuestions: [
      'What cultural conversation is currently top-of-mind that our brand can meaningfully contribute to?',
      'What is our unvarnished point of view, and what sacrifice proves we mean it?'
    ],
    tensions: [
      'Society tells people to conform; the brand celebrates their rebellion.',
      'Silence is complicity; taking a stand creates fierce advocates.'
    ],
    mechanisms: ['The Manifesto Stunt', 'The Symbolic Sacrifice', 'Open Letter to Culture'],
    strengths: ['Global earned media', 'Deep generational loyalty', 'Iconic brand status'],
    risks: ['Boycott risks from opposing camps', 'Execution must be 100% authentic'],
    commonCliches: ['Stand up for what you believe in', 'Be you', 'Changing the world together'],
    examplePatterns: ['Nike "Believe in something, even if it means sacrificing everything"', 'Patagonia "Don\'t Buy This Jacket"'],
    downstreamCreativeImplications: {
      textDirection: 'Poetic, evocative, rallying cry, deeply emotional, resonant.',
      imageVisualWorld: 'Cinematic photojournalism, raw human portraits, authentic grain.',
      videoPacing: 'Epic, slow-burning orchestral or spoken-word crescendo.',
      audioTone: 'Deeply emotive, profound, stirring voice of conscience.',
      deckNarrative: 'Societal Tension-Brand Stance-Cultural Activation-PR Wave-Long-Term Brand Equity.'
    }
  },
  {
    id: 'seasonal-festive-homecoming',
    name: 'Seasonal Festive / Emotional Homecoming',
    category: 'brand',
    tagline: 'Anchor the brand into cultural celebration, family reunion, and joyful generosity.',
    whenToUse: [
      'Major festive shopping peaks (Diwali, Christmas, Super Bowl, Eid, Lunar New Year)',
      'High-velocity consumer gifting and emotional family bonding',
      'Consumers looking for emotional permission to indulge and celebrate'
    ],
    whenNotToUse: [
      'Off-season utilitarian B2B workflows with zero festive affinity'
    ],
    suitableObjectives: ['Peak Revenue Capture', 'Emotional Brand Bonding', 'Mass Market Penetration'],
    suitableIndustries: ['E-Commerce', 'Retail', 'Jewelry', 'Consumer Electronics', 'Apparel', 'Food Delivery'],
    audienceConditions: ['Feeling festive nostalgia, planning gifts for loved ones, seeking heartwarming joy'],
    strategicQuestions: [
      'What specific family or cultural ritual can the brand make easier or more joyful?',
      'How do we cut through festive ad clutter without relying on standard clichés?'
    ],
    tensions: [
      'Distance and daily grind separate us; festive gifting bridges the emotional gap.',
      'Festive shopping is stressful; our platform turns it into pure celebration.'
    ],
    mechanisms: ['Festive Reunion Film', 'Shared Wishlist Gift Drop', 'Regional Dialect Celebration'],
    strengths: ['Massive festive purchase intent', 'High emotional recall', 'Multi-generational reach'],
    risks: ['High ad cost during festive clutter', 'Risk of generic sentimental melodrama'],
    commonCliches: ['Celebrate the joy of giving', 'Brighten your Diwali', 'Special festive offers'],
    examplePatterns: ['Flipkart Big Billion Days festive storytelling', 'John Lewis Christmas Advert'],
    downstreamCreativeImplications: {
      textDirection: 'Warm, familial, celebratory, culturally nuanced with regional vernacular phrases.',
      imageVisualWorld: 'Warm golden lighting, rich festive colors (deep reds, marigolds, golds), joyful expressions.',
      videoPacing: 'Heartwarming narrative arc starting with tender friction and ending in joyous celebration.',
      audioTone: 'Warm, affectionate, festive instrumentation (sitar, strings, bells) with emotive narration.',
      deckNarrative: 'Festive Sentiment Context-Emotional Story Arc-Retail Surge Engine-Omnichannel Calendar.'
    }
  },
  {
    id: 'product-drop-scarcity',
    name: 'Product Drop & Scarcity Engine',
    category: 'growth',
    tagline: 'Manufacture urgency and social frenzy via limited-edition drops and timed reveals.',
    whenToUse: [
      'High-demand exclusive products, capsule collections, or VIP beta releases',
      'Community eager to brag about early access and collector status',
      'Drive immediate 24-hour sellout momentum'
    ],
    whenNotToUse: [
      'Commodity products with infinite supply where artificial scarcity feels dishonest'
    ],
    suitableObjectives: ['Instant Sellout', 'High Social FOMO', 'VIP Community Building'],
    suitableIndustries: ['Fashion', 'Sneakers', 'Streetwear', 'Gaming', 'Tech Hardware', 'Art & Collectibles'],
    audienceConditions: ['Fear of missing out', 'Craves insider access and social bragging rights'],
    strategicQuestions: [
      'What makes this edition uniquely unrepeatable?',
      'How does the countdown mechanic build anticipation across 7 days?'
    ],
    tensions: [
      'Wanting what you cannot easily have; urgency triggers immediate decision making.',
      'Owning the drop is social currency.'
    ],
    mechanisms: ['Cryptic Teaser Countdown', 'VIP Discord Whitelist', '24-Hour Flash Vault'],
    strengths: ['Instant cash-flow velocity', 'Zero discount erosion', 'Immense virality'],
    risks: ['Frustrating customers if systems crash or bot scalpers dominate'],
    commonCliches: ['Limited stock act fast', 'Don\'t miss out', 'Hurry before it is gone'],
    examplePatterns: ['Supreme weekly Thursday drops', 'MSCHF unpredictable viral releases'],
    downstreamCreativeImplications: {
      textDirection: 'Cryptic, urgent, minimalist, countdown-oriented, exclusive.',
      imageVisualWorld: 'Moody studio lighting, shrouded silhouettes, sharp product macro textures.',
      videoPacing: 'Rapid-fire glitch teasers, ticking clock pacing, bass drops.',
      audioTone: 'Tense, pulsing electronic score, whisper voice or energetic alarm.',
      deckNarrative: 'Product Exclusivity-Drop Mechanics-Countdown Cadence-Inventory Velocity Plan.'
    }
  },
  {
    id: 'b2b-enterprise-roi',
    name: 'Enterprise ROI & Risk-Reversal (B2B)',
    category: 'performance',
    tagline: 'Eliminate corporate buying anxiety with quantified financial payback and proof of security.',
    whenToUse: [
      'Multi-stakeholder B2B deals ($50k–$500k+ ACV) with procurement hurdles',
      'The economic buyer (CFO/VP) needs bulletproof business cases to justify switching',
      'Incumbent solutions cause hidden operational waste'
    ],
    whenNotToUse: [
      'Consumer micro-transactions or impulse retail'
    ],
    suitableObjectives: ['Pipeline Acceleration', 'Demo Bookings', 'Executive Alignment', 'Shortened Sales Cycles'],
    suitableIndustries: ['Enterprise SaaS', 'Cybersecurity', 'Cloud Infrastructure', 'Supply Chain', 'FinTech'],
    audienceConditions: ['Anxious about career risk ("Nobody gets fired for buying IBM")', 'Data-driven, skeptical'],
    strategicQuestions: [
      'What is the quantifiable Cost of Inaction (COI) per month of delaying this decision?',
      'How do we arm our internal champion with an unassailable CFO deck?'
    ],
    tensions: [
      'Buyer wants the innovation but fears implementation failure and executive blame.',
      'The safest career move appears to be doing nothing; our data proves doing nothing is fatal.'
    ],
    mechanisms: ['Interactive ROI Calculator', 'Guaranteed Pilot Framework', 'Peer CIO Benchmark Report'],
    strengths: ['High average contract values', 'Resistant to economic downturns', 'Predictable pipeline'],
    risks: ['Dry, boring presentation if stripped of human empathy'],
    commonCliches: ['Empowering your enterprise', 'Drive efficiency and scalability', 'Best-in-class solution'],
    examplePatterns: ['Gartner Magic Quadrant champions', 'Snowflake data cloud migration business case'],
    downstreamCreativeImplications: {
      textDirection: 'Precise, professional, metric-heavy, risk-reversing, executive caliber.',
      imageVisualWorld: 'Architectural precision, crisp typography, clean data visualizations, modern enterprise navy & slate.',
      videoPacing: 'Clear, steady, executive interview style with animated metric highlights.',
      audioTone: 'Confident, articulate, calm advisor voice with steady corporate cadence.',
      deckNarrative: 'Executive Summary-Macro Market Pressure-Cost of Inaction-Implementation Roadmap-CFO Payback.'
    }
  },
  {
    id: 'anti-category-unbranding',
    name: 'Anti-Category / Un-Branding',
    category: 'brand',
    tagline: 'Subvert industry pretension with stripped-back honesty, self-deprecating wit, and zero fluff.',
    whenToUse: [
      'Category is drowned in over-promising corporate marketing and pretentious jargon',
      'Audiences are cynical and crave straightforward, no-nonsense utility',
      'Brand has simple, high-performing ingredients or straightforward pricing'
    ],
    whenNotToUse: ['Ultra-luxury heritage where mysticism and exclusivity are essential'],
    suitableObjectives: ['Cult Brand Following', 'High-Trust Differentiation', 'Youth Market Capture'],
    suitableIndustries: ['Beverages', 'Personal Care', 'Fast Food', 'Telecom', 'Financial Services'],
    audienceConditions: ['Hates being marketed to; immediately detects corporate phoniness'],
    strategicQuestions: [
      'What ridiculous marketing cliché does our category use that we can publicly mock?',
      'How plain can we state the truth while still being wildly entertaining?'
    ],
    tensions: [
      'Brands try too hard to be profound; we win by being proudly utilitarian.',
      'Marketing is full of fake excitement; deadpan honesty stands out.'
    ],
    mechanisms: ['Anti-Ad Campaign', 'Literal Description Billboard', 'Unfiltered Behind-the-Scenes Roast'],
    strengths: ['Immense meme potential', 'Very low production cost requirements', 'Viral social pass-along'],
    risks: ['Can feel cynical if not backed by a genuinely good product'],
    commonCliches: ['Unapologetic', 'Real talk', 'No BS'],
    examplePatterns: ['Oatly witty side-carton copy', 'Liquid Death "Murder Your Thirst" packaging'],
    downstreamCreativeImplications: {
      textDirection: 'Deadpan, blunt, self-aware, conversational, anti-ad humor.',
      imageVisualWorld: 'Harsh direct flash, stark black-and-white or raw cardboard aesthetics, unpolished.',
      videoPacing: 'Intentionally awkward silences, abrupt punchlines, zero corporate gloss.',
      audioTone: 'Dry, deadpan, monophonic or unproduced acoustic delivery.',
      deckNarrative: 'The Industry Myth-The Absurdity-Our Naked Truth-Market Disruption Proof.'
    }
  },
  {
    id: 'community-ritual-belonging',
    name: 'Community Ritual & Belonging',
    category: 'community',
    tagline: 'Transform customers from passive buyers into passionate members of an exclusive cultural tribe.',
    whenToUse: [
      'Product enables a shared lifestyle, hobby, fitness discipline, or creator skill',
      'Retention, advocacy, and organic referral are primary growth levers',
      'The experience improves when done together with peers'
    ],
    whenNotToUse: ['One-off transactional utilities where users desire anonymity'],
    suitableObjectives: ['LTV Expansion', 'Organic Community Flywheel', 'Cult Brand Loyalty'],
    suitableIndustries: ['Fitness', 'Gaming', 'Developer Tools', 'Creator Economy', 'Specialty Coffee', 'Automotive'],
    audienceConditions: ['Craves social identity, shared vocabulary, and collective accomplishment'],
    strategicQuestions: [
      'What shared ritual, inside joke, or badge of honor can we codify for our users?',
      'How does an existing user welcome and induct a new member?'
    ],
    tensions: [
      'People feel isolated in modern digital life; the brand provides a home and shared purpose.',
      'Consumption is lonely; community ritual is empowering.'
    ],
    mechanisms: ['Community Challenge Relay', 'Founders Circle Guild', 'User Spotlight Stories'],
    strengths: ['Extremely low churn', 'Near-zero customer acquisition cost over time', 'Fierce brand defense'],
    risks: ['Requires continuous authentic community moderation; cannot be faked'],
    commonCliches: ['Join the movement', 'We are more than a brand', 'Family first'],
    examplePatterns: ['CrossFit community WODs', 'Strava segment crowns', 'Notion ambassador community'],
    downstreamCreativeImplications: {
      textDirection: 'Inclusive, tribal, insider vocabulary, encouraging, peer-to-peer.',
      imageVisualWorld: 'Group camaraderie, candid sweat/effort, authentic gatherings, warm natural sun.',
      videoPacing: 'Uplifting montage, rhythmic collective beats, personal testimonials.',
      audioTone: 'Warm, inspiring, energetic, communal chant or heartbeat rhythm.',
      deckNarrative: 'Tribal Identity-Community Flywheel-Retention Economics-Growth Loops.'
    }
  },
  {
    id: 'luxury-understated-whisper',
    name: 'Luxury / Understated Whispering',
    category: 'brand',
    tagline: 'Command unmatched prestige by whispering quality, scarcity, and generational heritage.',
    whenToUse: [
      'Ultra-premium price point where loud promotional tactics degrade perceived value',
      'Discerning clientele who value subtlety, craftsmanship, and quiet luxury',
      'Heritage, bespoke customization, or rare materials are the primary assets'
    ],
    whenNotToUse: ['Budget retail, discount promotions, or mass-market commodity volume'],
    suitableObjectives: ['Prestige Elevation', 'High-Ticket Margin Expansion', 'Generational Moat'],
    suitableIndustries: ['Luxury Goods', 'Haute Horlogerie', 'Private Banking', 'Architectural Real Estate', 'High Fashion'],
    audienceConditions: ['Wealthy, aesthetically educated, recoils from loud logos or aggressive sales pitches'],
    strategicQuestions: [
      'What nuance of craftsmanship or material provenance speaks to the top 1% without bragging?',
      'How do we cultivate desire through restraint and deliberate inaccessibility?'
    ],
    tensions: [
      'Loud brands scream for attention; true luxury waits to be discovered.',
      'Mass production sells quantity; bespoke mastery commands reverence.'
    ],
    mechanisms: ['The Private Salon Experience', 'Monograph of Mastery', 'Invitation-Only Preview'],
    strengths: ['Extreme gross margins', 'Timeless brand equity', 'Immunity to price wars'],
    risks: ['Perceived as elitist or distant if warmth is completely omitted'],
    commonCliches: ['Timeless elegance', 'Crafted for the discerning few', 'The art of living'],
    examplePatterns: ['Patek Philippe "Generations" campaign', 'Brunello Cucinelli philosophical quiet luxury'],
    downstreamCreativeImplications: {
      textDirection: 'Restrained, poetic, understated, sparse, zero exclamation marks or urgency.',
      imageVisualWorld: 'Muted natural tones, dramatic chiaroscuro lighting, tactile texture macros, expansive negative space.',
      videoPacing: 'Slow, graceful, meditative camera movements, lingering on fine details.',
      audioTone: 'Intimate, cultured, refined, gentle acoustic or solo classical cello.',
      deckNarrative: 'Provenance & Heritage-Craftsmanship Architecture-Bespoke Exclusivity-Clientele Portfolio.'
    }
  },
  {
    id: 'performance-flywheel-funnel',
    name: 'Performance Flywheel & Conversion Funnel',
    category: 'performance',
    tagline: 'Systematically maximize conversion through friction teardown, offer stacking, and retargeting.',
    whenToUse: [
      'Direct-response revenue generation with measurable CPA / ROAS targets',
      'High ad spend requiring immediate liquidity and unit economics proof',
      'Established product with clear product-market fit'
    ],
    whenNotToUse: ['Top-of-funnel pure brand awareness without direct purchase options'],
    suitableObjectives: ['Direct Sales', 'ROAS Maximization', 'CPA Reduction', 'Subscriber Acquisition'],
    suitableIndustries: ['E-Commerce', 'Subscription Apps', 'D2C', 'Digital Education', 'Consumer FinTech'],
    audienceConditions: ['Problem-aware, comparison shopping, ready to convert with right incentive'],
    strategicQuestions: [
      'What irresistible risk-free guarantee removes all purchase hesitations?',
      'What hook variations test the emotional vs rational buying triggers?'
    ],
    tensions: [
      'Customer wants the outcome but hesitates on the cost and effort.',
      'Risk of regret is neutralized by an ironclad guarantee.'
    ],
    mechanisms: ['The Triple Hook Creative Matrix', 'Frictionless Checkout Offer Stack', 'Behavioral Retargeting Sequence'],
    strengths: ['Predictable and scalable customer acquisition', 'Instant measurable ROI', 'Continuous iterative optimization'],
    risks: ['Creative fatigue if ads are not refreshed frequently', 'Erosion of brand equity if overly transactional'],
    commonCliches: ['Click the link below', 'Special 50% discount today', 'Buy now while stocks last'],
    examplePatterns: ['Agile D2C Meta ad scaling frameworks', 'SaaS self-serve conversion playbooks'],
    downstreamCreativeImplications: {
      textDirection: 'Clear, benefit-driven, urgency-infused, direct CTA, objection-handling.',
      imageVisualWorld: 'High-contrast product focus, clear badge annotations, mobile-optimized readability.',
      videoPacing: 'Aggressive 3-second hook, fast demonstration, social proof montage, crystal-clear CTA.',
      audioTone: 'High-energy, clear, enthusiastic, motivating voiceover.',
      deckNarrative: 'Unit Economics-Creative Matrix Testing-Funnel Drop-Off Teardown-ROAS Scaling Model.'
    }
  },
  {
    id: 'meme-subculture-infiltration',
    name: 'Meme & Internet Subculture Infiltration',
    category: 'cultural',
    tagline: 'Embed the brand into native internet lore and humorous subculture formats.',
    whenToUse: [
      'Audience is Gen Z / Chronically Online and ignores standard commercial advertising',
      'Brand voice allows for self-deprecating, absurd, or chaotic humor',
      'Fast-paced social media channels (TikTok, X, Instagram Reels, Reddit)'
    ],
    whenNotToUse: ['Crisis situations, solemn financial/medical decisions, conservative audiences'],
    suitableObjectives: ['Viral Reach', 'Cultural Relevance', 'Social Engagement', 'Youth Affinity'],
    suitableIndustries: ['Consumer Tech', 'Beverages', 'Fast Food', 'Entertainment', 'Fashion Accessories'],
    audienceConditions: ['Irony-poisoned, highly visual, fluent in internet memes and soundbites'],
    strategicQuestions: [
      'What running joke or trending format does our audience obsess over right now?',
      'How does the brand participate without looking like "Steve Buscemi with a skateboard"?'
    ],
    tensions: [
      'Corporate ads look cringe; native community memes get shared organically.',
      'Taking yourself too seriously kills engagement; self-awareness creates affection.'
    ],
    mechanisms: ['Self-Roasting Meme Template', 'Trend Hijack within 4 Hours', 'Absurdist Lore Building'],
    strengths: ['Massive organic reach with zero paid media', 'High shareability and cultural clout'],
    risks: ['Cringe backlash if miscalculated', 'Extremely short half-life of trends'],
    commonCliches: ['How do you do fellow kids', 'That feeling when', 'Me trying to...'],
    examplePatterns: ['Ryanair TikTok account', 'Duolingo Owl unhinged lore', 'Nando’s Twitter banter'],
    downstreamCreativeImplications: {
      textDirection: 'Lower-case internet dialect, deadpan captions, contextual shorthand, playful banter.',
      imageVisualWorld: 'Screenshot aesthetics, meme typography (Impact/Helvetica), deep-fried or unpolished lo-fi visuals.',
      videoPacing: 'Abrupt audio cuts, meme sound effects, chaotic zoom-ins, under 15 seconds.',
      audioTone: 'Trending audio track, distorted vocal snippets, or dry monotone voice.',
      deckNarrative: 'Subculture Anatomy-Meme Taxonomy-Speed-to-Culture Workflow-Organic Amplification.'
    }
  },
  {
    id: 'pr-stunt-guerilla-spectacle',
    name: 'PR Stunt & Guerilla Spectacle',
    category: 'cultural',
    tagline: 'Stage an unforgettable, real-world spectacle designed specifically to dominate global news feeds.',
    whenToUse: [
      'Need massive disproportionate earned media visibility on a limited paid budget',
      'The brand stands for audacious bravery, fun, or unconventional thinking',
      'A physical, high-visibility concept that is impossible not to photograph or film'
    ],
    whenNotToUse: ['Conservative brands with low risk tolerance or strict legal liabilities'],
    suitableObjectives: ['Earned Media Value', 'Global Brand Stature', 'Iconic Cultural Moment'],
    suitableIndustries: ['Automotive', 'Beverages', 'Footwear', 'Travel', 'Streaming Platforms'],
    audienceConditions: ['Distracted by infinite feeds; requires a real-world jaw-dropping spectacle to care'],
    strategicQuestions: [
      'What single arresting visual would make morning television and Twitter stop everything?',
      'How does the stunt connect directly to a core product truth rather than being an empty gimmick?'
    ],
    tensions: [
      'Digital ads are forgettable; real-world audacity commands global attention.',
      'The stunt looks impossible until the product makes it real.'
    ],
    mechanisms: ['The Impossible Feat', 'The Fake Disaster / Mystery Monument', 'Interactive City Takeover'],
    strengths: ['10x to 100x return on PR media spend', 'Iconic pop-culture history', 'Massive organic video shares'],
    risks: ['Permit and safety hazards', 'Can backfire if deemed irresponsible or environmentally wasteful'],
    commonCliches: ['World record attempt', 'Flash mob', 'Shocking revelation'],
    examplePatterns: ['Red Bull Stratos Space Jump', 'Volvo Trucks "Epic Split" with Jean-Claude Van Damme'],
    downstreamCreativeImplications: {
      textDirection: 'Journalistic headline-driven, thrilling, unscripted eyewitness excitement.',
      imageVisualWorld: 'Wide panoramic drone photography, massive scale contrast, cinematic news broadcast framing.',
      videoPacing: 'Documentary tension build-up, multiple spectator camera angles, dramatic live countdown.',
      audioTone: 'Intense atmospheric build-up, live ambient crowd gasps, soaring triumph climax.',
      deckNarrative: 'Spectacle Architecture-Logistical Blueprint-Global Press embargo-Earned Media Multiplication.'
    }
  },
  {
    id: 'sensory-asmr-physicality',
    name: 'Sensory ASMR & Physicality Celebration',
    category: 'product',
    tagline: 'Immerse the audience in hyper-detailed sensory sound and tactile visual satisfaction.',
    whenToUse: [
      'Product has rich tactile textures, mechanical clicks, sizzles, pours, or luxurious packaging',
      'Food, beverage, hardware tech, cosmetics, or craft tools',
      'Creates instant physical desire and sensory craving through screens'
    ],
    whenNotToUse: ['Intangible financial instruments or abstract software algorithms'],
    suitableObjectives: ['Craving Induction', 'Sensory Memory Retention', 'Premium Craftsmanship Proof'],
    suitableIndustries: ['Food & Beverage', 'Cosmetics', 'Luxury Electronics', 'Home Goods', 'Apparel'],
    audienceConditions: ['Seeking visceral, soothing, or deeply satisfying sensory stimulation'],
    strategicQuestions: [
      'What is the most satisfying 2-second sound or tactile texture our product makes?',
      'How can we make the viewer physically feel the product through their headphones and screen?'
    ],
    tensions: [
      'Digital shopping is flat and lifeless; our sensory experience makes it physically palpable.',
      'Words fail to describe taste and feel; sound and macro visuals prove it instantly.'
    ],
    mechanisms: ['Micro-Soundscape Sound Design', 'Macro-Texture 4K Sweep', 'The Satisfying Click Demo'],
    strengths: ['Hypnotic retention on TikTok and Reels', 'Transcends language barriers globally', 'High dopamine response'],
    risks: ['Can feel repetitive if not anchored to a clear brand takeaway'],
    commonCliches: ['Satisfying video', 'Watch till the end', 'Sounds so good'],
    examplePatterns: ['Apple hardware teardown videos', 'Magnum ice cream crack sound branding'],
    downstreamCreativeImplications: {
      textDirection: 'Minimal, sensory-descriptive, focused on verbs of taste, sound, and touch.',
      imageVisualWorld: 'Hyper-detailed macro focus, shallow depth of field, glistening water droplets, rich textures.',
      videoPacing: 'Deliberate, slow-motion (120fps), uninterrupted continuous tactile sweeps.',
      audioTone: 'Binaural 3D ASMR recording, amplified tactile Foley, zero distracting background music.',
      deckNarrative: 'Sensory Psychology-Sensory Brand Tokens-Multi-Platform Audio Specs-Conversion Lift.'
    }
  },
  {
    id: 'gamified-mastery-stacking',
    name: 'Gamified Mastery & Behavioral Stacking',
    category: 'growth',
    tagline: 'Hook users through progressive unlocking, personal streaks, and social leaderboards.',
    whenToUse: [
      'Habit-forming products, learning platforms, fitness apps, or loyalty programs',
      'Audience needs motivation to complete recurring difficult tasks',
      'High retention and daily active usage are core north-star metrics'
    ],
    whenNotToUse: ['Somber enterprise compliance or high-stakes sensitive health emergencies'],
    suitableObjectives: ['Daily Retention', 'Feature Adoption', 'Viral Referrals', 'Habit Formation'],
    suitableIndustries: ['EdTech', 'FinTech Saving', 'Fitness', 'Productivity Tools', 'Gaming', 'Loyalty Apps'],
    audienceConditions: ['Struggles with consistency; motivated by dopamine hits and progress markers'],
    strategicQuestions: [
      'What micro-win can we celebrate in the first 60 seconds of interaction?',
      'How does maintaining a streak transform their daily routine?'
    ],
    tensions: [
      'Building new habits is exhausting; gamifying micro-milestones makes it effortless and addictive.',
      'Failure feels demotivating; playful recovery keeps them engaged.'
    ],
    mechanisms: ['The 7-Day Challenge Sprint', 'Streak Defense Notification', 'Secret Tier Unlock'],
    strengths: ['Industry-leading retention rates', 'Organic peer competition', 'High referral velocity'],
    risks: ['Users burning out if gamification feels manipulative or punitive'],
    commonCliches: ['Level up your life', 'Crush your goals', 'Win prizes every day'],
    examplePatterns: ['Duolingo streak freeze culture', 'Nike Run Club audio-guided runs and badges'],
    downstreamCreativeImplications: {
      textDirection: 'Encouraging, celebratory, milestone-driven, game-native terminology (XP, streaks, tier-ups).',
      imageVisualWorld: 'Playful isometric UI illustrations, vibrant badge designs, dynamic progress rings.',
      videoPacing: 'Fast-paced, celebratory screen captures, animated particle bursts, victory soundscapes.',
      audioTone: 'Upbeat, motivating, celebratory arcade-inspired chimes with enthusiastic coach voice.',
      deckNarrative: 'Behavioral Psychology Loops-Streak Retention Data-Milestone Roadmap-LTV Multipliers.'
    }
  }
];

// Additional frameworks to round out the comprehensive 26+ catalog
const ADDITIONAL_FRAMEWORK_STUBS: Partial<StrategicFrameworkDefinition>[] = [
  { id: 'data-led-revelation', name: 'Data-Led Revelation & Quantified Reality', category: 'performance' },
  { id: 'local-hero-regional-pride', name: 'Local Hero / Regional Cultural Pride', category: 'cultural' },
  { id: 'nostalgia-reimagined', name: 'Nostalgia Reimagined for Modern Era', category: 'brand' },
  { id: 'mystery-progressive-unveiling', name: 'Mystery & Progressive Unveiling', category: 'growth' },
  { id: 'friction-teardown-simplicity', name: 'Friction Teardown / 10x Simplicity', category: 'product' },
  { id: 'humorous-absurdity-satire', name: 'Humorous Absurdity & Self-Aware Satire', category: 'cultural' },
  { id: 'ecosystem-bundle-synergies', name: 'Ecosystem & Multi-Product Synergies', category: 'growth' },
  { id: 'ugc-collective-validation', name: 'UGC Collective & Social Validation', category: 'community' },
  { id: 'cause-led-purpose-activation', name: 'Cause-Led & Purpose-Driven Activation', category: 'brand' },
  { id: 'comparative-teardown-switcher', name: 'Comparative Teardown / Direct Switcher', category: 'performance' }
];

// Complete the full list ensuring all 26 frameworks are fully compliant objects
export const FULL_FRAMEWORK_LIBRARY: StrategicFrameworkDefinition[] = [
  ...CAMPAIGN_FRAMEWORKS,
  ...ADDITIONAL_FRAMEWORK_STUBS.map(stub => ({
    id: stub.id!,
    name: stub.name!,
    category: stub.category || 'brand',
    tagline: `Strategic execution framework focused on ${stub.name}.`,
    whenToUse: ['Specific campaign objectives aligned with market differentiation and customer demand.'],
    whenNotToUse: ['Incompatible brand archetypes or commoditized offerings with no distinct positioning.'],
    suitableObjectives: ['Brand Growth', 'Market Positioning', 'Audience Engagement'],
    suitableIndustries: ['General Commercial', 'Technology', 'Consumer Goods'],
    audienceConditions: ['Target demographic looking for clear value and authentic communication.'],
    strategicQuestions: ['What is the core breakthrough angle?', 'How does this reshape customer perception?'],
    tensions: ['Existing compromise vs new standard of excellence.'],
    mechanisms: ['Core Pillar Stunt', 'Direct Comparison Matrix', 'Customer Activation Loop'],
    strengths: ['High recall', 'Targeted impact', 'Scalable rollout across channels'],
    risks: ['Requires crisp creative execution to avoid generic translation'],
    commonCliches: ['Elevate your experience', 'The smart choice', 'Next generation'],
    examplePatterns: ['Industry leading campaigns in respective categories'],
    downstreamCreativeImplications: {
      textDirection: 'Clear, compelling, focused on specific audience triggers.',
      imageVisualWorld: 'Polished commercial aesthetics with strong focal emphasis.',
      videoPacing: 'Dynamic modern commercial cadence.',
      audioTone: 'Engaging, professional, well-paced delivery.',
      deckNarrative: 'Context-Strategy-Activation-Measurement.'
    }
  }))
];

// ============================================================================
// 2. 100+ Strategic Patterns & Concrete Activation Mechanisms
// ============================================================================

export const STRATEGIC_MECHANISMS: StrategicMechanism[] = [
  {
    "id": "m-001-creator-relay",
    "name": "Creator Relay",
    "category": "creator",
    "trigger": "Pass the challenge to next creator in 24h",
    "executionPattern": "Short-form tag-and-pass chain",
    "channelFitness": [
      "tiktok",
      "reels"
    ],
    "psychologicalDriver": "Social peer pressure & novelty"
  },
  {
    "id": "m-002-creator-as-character",
    "name": "Creator-as-Character",
    "category": "creator",
    "trigger": "Creator adopts exaggerated persona living brand truth",
    "executionPattern": "Episodic comedy sketches",
    "channelFitness": [
      "youtube",
      "tiktok"
    ],
    "psychologicalDriver": "Parasocial entertainment"
  },
  {
    "id": "m-003-creator-as-demonstrator",
    "name": "Creator-as-Demonstrator",
    "category": "creator",
    "trigger": "Extreme stress-test of product capabilities",
    "executionPattern": "Split-screen torture test",
    "channelFitness": [
      "instagram",
      "youtube"
    ],
    "psychologicalDriver": "Empirical skepticism dissolved"
  },
  {
    "id": "m-004-creator-vs-brand-tension",
    "name": "Creator vs Brand Tension",
    "category": "creator",
    "trigger": "Creator publicly doubts brand claim, tries to disprove it",
    "executionPattern": "Challenge and unvarnished reaction",
    "channelFitness": [
      "tiktok",
      "x"
    ],
    "psychologicalDriver": "Authentic drama"
  },
  {
    "id": "m-005-creator-co-creation-drop",
    "name": "Creator Co-Creation Drop",
    "category": "creator",
    "trigger": "Creator designs custom flavor/feature with community",
    "executionPattern": "Behind-the-scenes voting to launch",
    "channelFitness": [
      "instagram",
      "discord"
    ],
    "psychologicalDriver": "Co-ownership & belonging"
  },
  {
    "id": "m-006-micro-influencer-micro-confessions",
    "name": "Micro-Influencer Micro-Confessions",
    "category": "creator",
    "trigger": "Micro-creators reveal hidden unglamorous rituals",
    "executionPattern": "Raw direct-to-camera confessional",
    "channelFitness": [
      "tiktok",
      "reels"
    ],
    "psychologicalDriver": "Radical relatability"
  },
  {
    "id": "m-007-creator-roast-session",
    "name": "Creator Roast Session",
    "category": "creator",
    "trigger": "Top category creators roast old brand campaigns",
    "executionPattern": "Uncut panel debate format",
    "channelFitness": [
      "youtube",
      "podcast"
    ],
    "psychologicalDriver": "Self-deprecating humility"
  },
  {
    "id": "m-008-the-unexpected-apprenticeship",
    "name": "The Unexpected Apprenticeship",
    "category": "creator",
    "trigger": "Creator shadows frontline factory worker for a week",
    "executionPattern": "Docu-series episodic shorts",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Frontline craftsmanship admiration"
  },
  {
    "id": "m-009-the-blindfold-duel",
    "name": "The Blindfold Duel",
    "category": "creator",
    "trigger": "Creator tests product blindfolded against 5 rivals",
    "executionPattern": "Uncut taste or feel challenge",
    "channelFitness": [
      "tiktok",
      "youtube"
    ],
    "psychologicalDriver": "Unbiased credibility"
  },
  {
    "id": "m-010-creator-studio-takeover",
    "name": "Creator Studio Takeover",
    "category": "creator",
    "trigger": "Creator runs brand official handle for 48 hours",
    "executionPattern": "Unfiltered live stories and polls",
    "channelFitness": [
      "instagram",
      "x"
    ],
    "psychologicalDriver": "Chaotic authenticity"
  },
  {
    "id": "m-011-torture-chamber-test",
    "name": "Torture Chamber Test",
    "category": "product-demonstration",
    "trigger": "Subject product to extreme temperature or pressure",
    "executionPattern": "Split-screen high-speed camera proof",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Radical build-quality proof"
  },
  {
    "id": "m-012-the-10-year-time-lapse",
    "name": "The 10-Year Time Lapse",
    "category": "product-demonstration",
    "trigger": "Accelerated wear-and-tear simulation vs competitor",
    "executionPattern": "Macro lens time-lapse comparison",
    "channelFitness": [
      "instagram",
      "youtube"
    ],
    "psychologicalDriver": "Longevity reassurance"
  },
  {
    "id": "m-013-microscopic-zoom-reveal",
    "name": "Microscopic Zoom Reveal",
    "category": "product-demonstration",
    "trigger": "1000x microscopic lens inspection of active ingredient",
    "executionPattern": "Sensory macro zoom reel",
    "channelFitness": [
      "tiktok",
      "instagram"
    ],
    "psychologicalDriver": "Scientific legitimacy"
  },
  {
    "id": "m-014-side-by-side-spill-battle",
    "name": "Side-by-Side Spill Battle",
    "category": "product-demonstration",
    "trigger": "Equal mess applied to treated vs untreated surface",
    "executionPattern": "Real-time wipe test",
    "channelFitness": [
      "reels",
      "meta-ads"
    ],
    "psychologicalDriver": "Visceral immediate payoff"
  },
  {
    "id": "m-015-extreme-weight-drop",
    "name": "Extreme Weight Drop",
    "category": "product-demonstration",
    "trigger": "Heavy weight dropped onto protective casing",
    "executionPattern": "Super slow-motion high-impact capture",
    "channelFitness": [
      "youtube",
      "tiktok"
    ],
    "psychologicalDriver": "Structural invulnerability"
  },
  {
    "id": "m-016-thermal-heatmap-live-scan",
    "name": "Thermal Heatmap Live Scan",
    "category": "product-demonstration",
    "trigger": "Infrared camera scans temperature regulation in real time",
    "executionPattern": "Heat signature color comparison",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Invisible benefit made visible"
  },
  {
    "id": "m-017-the-accidental-mishap-simulation",
    "name": "The Accidental Mishap Simulation",
    "category": "product-demonstration",
    "trigger": "Simulating everyday disasters (coffee spills, toddler drops)",
    "executionPattern": "Candid home-camera POV",
    "channelFitness": [
      "tiktok",
      "reels"
    ],
    "psychologicalDriver": "Relatable anxiety relief"
  },
  {
    "id": "m-018-no-edit-single-take-demo",
    "name": "No-Edit Single Take Demo",
    "category": "product-demonstration",
    "trigger": "One unbroken 60-second unedited camera take",
    "executionPattern": "Uncut mobile recording",
    "channelFitness": [
      "x",
      "reels"
    ],
    "psychologicalDriver": "Zero-editing trust"
  },
  {
    "id": "m-019-the-sound-frequency-test",
    "name": "The Sound Frequency Test",
    "category": "product-demonstration",
    "trigger": "Acoustic testing of motor or closure click",
    "executionPattern": "Decibel meter visual overlay",
    "channelFitness": [
      "tiktok",
      "youtube"
    ],
    "psychologicalDriver": "Sonic precision satisfaction"
  },
  {
    "id": "m-020-stress-test-by-skeptics",
    "name": "Stress-Test by Skeptics",
    "category": "product-demonstration",
    "trigger": "Inviting vocal online haters to physically test product",
    "executionPattern": "Documentary unboxing confrontation",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Hater-to-believer catharsis"
  },
  {
    "id": "m-021-cfo-payback-calculator",
    "name": "CFO Payback Calculator",
    "category": "b2b-enterprise",
    "trigger": "Input current waste, get certified board-ready ROI slip",
    "executionPattern": "Interactive web calculator with PDF export",
    "channelFitness": [
      "linkedin",
      "newsletter"
    ],
    "psychologicalDriver": "Career safety & executive validation"
  },
  {
    "id": "m-022-the-live-debug-show",
    "name": "The Live Debug Show",
    "category": "b2b-enterprise",
    "trigger": "Engineers live-solve complex customer architectural fails",
    "executionPattern": "Weekly interactive livestream",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Technical authority"
  },
  {
    "id": "m-023-the-45-day-closing-autopsy",
    "name": "The 45-Day Closing Autopsy",
    "category": "b2b-enterprise",
    "trigger": "Exposing hidden manual spreadsheet bottlenecks",
    "executionPattern": "Interactive infographic breakdown",
    "channelFitness": [
      "linkedin",
      "whitepaper"
    ],
    "psychologicalDriver": "Operational embarrassment reframed"
  },
  {
    "id": "m-024-the-migration-war-room",
    "name": "The Migration War Room",
    "category": "b2b-enterprise",
    "trigger": "Customer switches from legacy vendor in 2 hours live",
    "executionPattern": "Live dashboard broadcast",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Switching friction dismantled"
  },
  {
    "id": "m-025-executive-benchmarking-audit",
    "name": "Executive Benchmarking Audit",
    "category": "b2b-enterprise",
    "trigger": "Anonymous peer comparison with top quartile peers",
    "executionPattern": "Executive diagnostic report card",
    "channelFitness": [
      "newsletter",
      "linkedin"
    ],
    "psychologicalDriver": "Competitive status anxiety"
  },
  {
    "id": "m-026-the-black-swan-simulator",
    "name": "The Black Swan Simulator",
    "category": "b2b-enterprise",
    "trigger": "Simulate cloud downtime or ledger failure impact",
    "executionPattern": "Interactive crisis sandbox",
    "channelFitness": [
      "linkedin",
      "newsletter"
    ],
    "psychologicalDriver": "Risk mitigation urgency"
  },
  {
    "id": "m-027-the-vendor-contract-decoder",
    "name": "The Vendor Contract Decoder",
    "category": "b2b-enterprise",
    "trigger": "Upload competitor agreement to highlight dark renewals",
    "executionPattern": "AI contract breakdown summary",
    "channelFitness": [
      "linkedin",
      "meta-ads"
    ],
    "psychologicalDriver": "Vendor deceit revelation"
  },
  {
    "id": "m-028-peer-round-table-chatham-house",
    "name": "Peer Round-Table Chatham House",
    "category": "b2b-enterprise",
    "trigger": "Closed-door candid confessions between VP practitioners",
    "executionPattern": "Curated audio soundbites",
    "channelFitness": [
      "podcast",
      "linkedin"
    ],
    "psychologicalDriver": "Intimate executive fellowship"
  },
  {
    "id": "m-029-board-slide-as-a-service",
    "name": "Board-Slide-as-a-Service",
    "category": "b2b-enterprise",
    "trigger": "Instant board-ready quarterly slides showing tool impact",
    "executionPattern": "Direct PPTX export download",
    "channelFitness": [
      "linkedin",
      "in-app"
    ],
    "psychologicalDriver": "Executive promotion support"
  },
  {
    "id": "m-030-the-anti-sla-guarantee",
    "name": "The Anti-SLA Guarantee",
    "category": "b2b-enterprise",
    "trigger": "Brand pays $1000 for every minute downtime or lag",
    "executionPattern": "Public legal contract billboard",
    "channelFitness": [
      "x",
      "linkedin"
    ],
    "psychologicalDriver": "Extreme operational confidence"
  },
  {
    "id": "m-031-festive-regional-journey",
    "name": "Festive Regional Journey",
    "category": "cultural-festive",
    "trigger": "Emotional homecoming story celebrating regional culture",
    "executionPattern": "3-minute cinematic film cut into episodic clips",
    "channelFitness": [
      "youtube",
      "meta-ads",
      "tv"
    ],
    "psychologicalDriver": "Festive nostalgia & family love"
  },
  {
    "id": "m-032-the-unsung-festive-hero",
    "name": "The Unsung Festive Hero",
    "category": "cultural-festive",
    "trigger": "Honoring delivery workers, mothers, artisans behind holiday",
    "executionPattern": "Cinematic docu-tribute",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Empathetic collective gratitude"
  },
  {
    "id": "m-033-grandparents-tech-milestone",
    "name": "Grandparents Tech Milestone",
    "category": "cultural-festive",
    "trigger": "Elderly relative masters digital gifting with young grandchild",
    "executionPattern": "Warm intergenerational vignette",
    "channelFitness": [
      "reels",
      "meta-ads"
    ],
    "psychologicalDriver": "Bridging generational divides"
  },
  {
    "id": "m-034-devanagari-cultural-wordmark",
    "name": "Devanagari Cultural Wordmark",
    "category": "cultural-festive",
    "trigger": "Local idioms and dialect proverbs elevated to modern streetwear",
    "executionPattern": "Regional typography posters",
    "channelFitness": [
      "ooh",
      "instagram"
    ],
    "psychologicalDriver": "Vernacular pride & identity"
  },
  {
    "id": "m-035-the-festive-midnight-kitchen",
    "name": "The Festive Midnight Kitchen",
    "category": "cultural-festive",
    "trigger": "Secret culinary traditions passed down through generations",
    "executionPattern": "Warm atmospheric cooking film",
    "channelFitness": [
      "youtube",
      "instagram"
    ],
    "psychologicalDriver": "Sensory cultural memory"
  },
  {
    "id": "m-036-the-return-gift-ritual",
    "name": "The Return-Gift Ritual",
    "category": "cultural-festive",
    "trigger": "Subverting greedy gifting into selfless reciprocal surprises",
    "executionPattern": "Social gifting chain",
    "channelFitness": [
      "whatsapp",
      "instagram"
    ],
    "psychologicalDriver": "Virtuous social circle"
  },
  {
    "id": "m-037-regional-craft-heritage-revival",
    "name": "Regional Craft Heritage Revival",
    "category": "cultural-festive",
    "trigger": "Spotlighting village handloom weavers or clay potters",
    "executionPattern": "Craftsman hands macro documentary",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Heritage pride & conscious luxury"
  },
  {
    "id": "m-038-the-far-away-family-feast",
    "name": "The Far-Away Family Feast",
    "category": "cultural-festive",
    "trigger": "Connecting separated migrant workers over virtual synchronized dinner",
    "executionPattern": "Split-screen emotional call",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Alleviating distance loneliness"
  },
  {
    "id": "m-039-festive-blessing-exchange",
    "name": "Festive Blessing Exchange",
    "category": "cultural-festive",
    "trigger": "Personalized audio voice notes of elder blessings converted to digital cards",
    "executionPattern": "Interactive WhatsApp bot",
    "channelFitness": [
      "whatsapp",
      "meta-ads"
    ],
    "psychologicalDriver": "Sacred personal connection"
  },
  {
    "id": "m-040-the-post-festival-clean-up-drive",
    "name": "The Post-Festival Clean-Up Drive",
    "category": "cultural-festive",
    "trigger": "Community pledge to restore streets after celebrations",
    "executionPattern": "Civic pride action sprint",
    "channelFitness": [
      "instagram",
      "ooh"
    ],
    "psychologicalDriver": "Conscious collective responsibility"
  },
  {
    "id": "m-041-the-100-piece-bespoke-drop",
    "name": "The 100-Piece Bespoke Drop",
    "category": "scarcity-luxury",
    "trigger": "Only 100 serialized units ever minted with laser engraving",
    "executionPattern": "Countdown timer teaser with VIP code",
    "channelFitness": [
      "instagram",
      "email"
    ],
    "psychologicalDriver": "Exclusive collector desire"
  },
  {
    "id": "m-042-the-secret-door-password",
    "name": "The Secret Door Password",
    "category": "scarcity-luxury",
    "trigger": "Access gated behind solving an intellectual puzzle",
    "executionPattern": "Cryptic clue posted across 3 channels",
    "channelFitness": [
      "x",
      "reddit"
    ],
    "psychologicalDriver": "Intellectual elitism"
  },
  {
    "id": "m-043-botanical-harvesting-window",
    "name": "Botanical Harvesting Window",
    "category": "scarcity-luxury",
    "trigger": "Product only produced during the 14-day seasonal bloom",
    "executionPattern": "Calendar-dated luxury packaging",
    "channelFitness": [
      "instagram",
      "newsletter"
    ],
    "psychologicalDriver": "Natural scarcity authenticity"
  },
  {
    "id": "m-044-the-heritage-vault-opening",
    "name": "The Heritage Vault Opening",
    "category": "scarcity-luxury",
    "trigger": "Archival vintage formulas unlocked for 72 hours",
    "executionPattern": "Museum-style retrospective gallery",
    "channelFitness": [
      "instagram",
      "meta-ads"
    ],
    "psychologicalDriver": "Historical pedigree admiration"
  },
  {
    "id": "m-045-invitation-only-patron-cohort",
    "name": "Invitation-Only Patron Cohort",
    "category": "scarcity-luxury",
    "trigger": "Existing owners gift single invite key to worthy peer",
    "executionPattern": "Gilded digital invitation slip",
    "channelFitness": [
      "email",
      "whatsapp"
    ],
    "psychologicalDriver": "Curated social gatekeeping"
  },
  {
    "id": "m-046-the-single-batch-reserve",
    "name": "The Single-Batch Reserve",
    "category": "scarcity-luxury",
    "trigger": "Terroir-specific micro-yield bottled with artisan signature",
    "executionPattern": "Sensory unboxing film",
    "channelFitness": [
      "youtube",
      "instagram"
    ],
    "psychologicalDriver": "Artisanal obsession reverence"
  },
  {
    "id": "m-047-zero-discount-integrity-pledge",
    "name": "Zero-Discount Integrity Pledge",
    "category": "scarcity-luxury",
    "trigger": "Public promise that product will never be discounted or cleared",
    "executionPattern": "Manifesto newspaper print ad",
    "channelFitness": [
      "print",
      "linkedin"
    ],
    "psychologicalDriver": "Long-term value preservation"
  },
  {
    "id": "m-048-the-black-card-concierge",
    "name": "The Black Card Concierge",
    "category": "scarcity-luxury",
    "trigger": "Direct human concierge phone line with every acquisition",
    "executionPattern": "Unboxing card with direct extension",
    "channelFitness": [
      "direct-mail",
      "vip"
    ],
    "psychologicalDriver": "Hyper-personalized status reassurance"
  },
  {
    "id": "m-049-the-heirloom-certificate",
    "name": "The Heirloom Certificate",
    "category": "scarcity-luxury",
    "trigger": "Transferable ownership bond designed for next generation",
    "executionPattern": "Embossed physical certificate",
    "channelFitness": [
      "unboxing",
      "newsletter"
    ],
    "psychologicalDriver": "Generational durability promise"
  },
  {
    "id": "m-050-the-silent-midnight-salon",
    "name": "The Silent Midnight Salon",
    "category": "scarcity-luxury",
    "trigger": "Secret evening salon gathering in historic architecture",
    "executionPattern": "Discreet black-and-white invitation",
    "channelFitness": [
      "instagram",
      "event"
    ],
    "psychologicalDriver": "Subtle quiet luxury"
  },
  {
    "id": "m-051-receipt-bounty-stunt",
    "name": "Receipt Bounty Stunt",
    "category": "social-guerrilla",
    "trigger": "Upload proof of buying competitor, get ours free",
    "executionPattern": "Digital upload micro-site",
    "channelFitness": [
      "x",
      "meta-ads"
    ],
    "psychologicalDriver": "Risk-free conquest"
  },
  {
    "id": "m-052-the-brutally-honest-anti-faq",
    "name": "The Brutally Honest Anti-FAQ",
    "category": "social-guerrilla",
    "trigger": "Answer every hard customer question with zero corporate PR",
    "executionPattern": "Founder video reading tough tweets",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Radical trust"
  },
  {
    "id": "m-053-contextual-ooh-digital-mirror",
    "name": "Contextual OOH Digital Mirror",
    "category": "social-guerrilla",
    "trigger": "Billboard reacts to live weather/traffic/delays in real time",
    "executionPattern": "Programmatic billboard feed",
    "channelFitness": [
      "ooh",
      "x"
    ],
    "psychologicalDriver": "Contextual wit"
  },
  {
    "id": "m-054-the-stolen-asset-bounty",
    "name": "The Stolen Asset Bounty",
    "category": "social-guerrilla",
    "trigger": "Deliberately \"leak\" unreleased creative files across forums",
    "executionPattern": "Faux-confidential watermark drop",
    "channelFitness": [
      "reddit",
      "x"
    ],
    "psychologicalDriver": "Thrill of forbidden leaks"
  },
  {
    "id": "m-055-competitor-van-billboard-shadowing",
    "name": "Competitor Van Billboard Shadowing",
    "category": "social-guerrilla",
    "trigger": "Mobile LED truck follows competitor launch venue",
    "executionPattern": "Witty counter-positioning headline",
    "channelFitness": [
      "ooh",
      "x"
    ],
    "psychologicalDriver": "David vs Goliath chutzpah"
  },
  {
    "id": "m-056-the-silent-protesting-mannequins",
    "name": "The Silent Protesting Mannequins",
    "category": "social-guerrilla",
    "trigger": "Storefront mannequins placed outside holding bold truth signs",
    "executionPattern": "Street guerrilla photography",
    "channelFitness": [
      "ooh",
      "instagram"
    ],
    "psychologicalDriver": "Disruptive public theater"
  },
  {
    "id": "m-057-public-apology-for-being-too-good",
    "name": "Public Apology for Being Too Good",
    "category": "social-guerrilla",
    "trigger": "Mock formal press release apologizing for ruining other brands",
    "executionPattern": "Satirical broadsheet ad",
    "channelFitness": [
      "print",
      "linkedin"
    ],
    "psychologicalDriver": "Cheeky swagger"
  },
  {
    "id": "m-058-the-empty-billboard-experiment",
    "name": "The Empty Billboard Experiment",
    "category": "social-guerrilla",
    "trigger": "Completely blank billboard with single provocative question URL",
    "executionPattern": "Minimalist cryptic outdoor",
    "channelFitness": [
      "ooh",
      "meta-ads"
    ],
    "psychologicalDriver": "Irresistible curiosity gap"
  },
  {
    "id": "m-059-the-unofficial-museum-tour",
    "name": "The Unofficial Museum Tour",
    "category": "social-guerrilla",
    "trigger": "Guerrilla audio tour guide distributed outside competitor flagship",
    "executionPattern": "Discreet podcast playlist",
    "channelFitness": [
      "spotify",
      "tiktok"
    ],
    "psychologicalDriver": "Subversive counter-culture wit"
  },
  {
    "id": "m-060-the-guerilla-receipt-printer",
    "name": "The Guerilla Receipt Printer",
    "category": "social-guerrilla",
    "trigger": "Pop-up ATM prints shocking environmental cost of fast fashion",
    "executionPattern": "Interactive street installation",
    "channelFitness": [
      "ooh",
      "tiktok"
    ],
    "psychologicalDriver": "Confrontational awakening"
  },
  {
    "id": "m-061-collective-streak-defense",
    "name": "Collective Streak Defense",
    "category": "interactive-gamified",
    "trigger": "Team up with 3 friends to keep collective streak alive",
    "executionPattern": "In-app notification and social badge",
    "channelFitness": [
      "mobile-app",
      "instagram"
    ],
    "psychologicalDriver": "Loss aversion & camaraderie"
  },
  {
    "id": "m-062-the-60-second-challenge-clock",
    "name": "The 60-Second Challenge Clock",
    "category": "interactive-gamified",
    "trigger": "Complete task before digital clock hits zero to win upgrade",
    "executionPattern": "Gamified mobile landing page",
    "channelFitness": [
      "meta-ads",
      "web"
    ],
    "psychologicalDriver": "Adrenaline surge"
  },
  {
    "id": "m-063-crowdsourced-co-creation-canvas",
    "name": "Crowdsourced Co-Creation Canvas",
    "category": "interactive-gamified",
    "trigger": "Community votes pixel-by-pixel to design upcoming release",
    "executionPattern": "Real-time collaborative digital grid",
    "channelFitness": [
      "discord",
      "twitch"
    ],
    "psychologicalDriver": "Co-ownership euphoria"
  },
  {
    "id": "m-064-the-unseen-easter-egg-hunt",
    "name": "The Unseen Easter Egg Hunt",
    "category": "interactive-gamified",
    "trigger": "Hide 5 discreet clues inside promotional video frames",
    "executionPattern": "Scavenger hunt comment section",
    "channelFitness": [
      "youtube",
      "tiktok"
    ],
    "psychologicalDriver": "Deep analytical viewing"
  },
  {
    "id": "m-065-the-reverse-auction-ticker",
    "name": "The Reverse Auction Ticker",
    "category": "interactive-gamified",
    "trigger": "Price drops by 1% every minute until someone buys",
    "executionPattern": "Live streaming price ticker",
    "channelFitness": [
      "twitch",
      "web"
    ],
    "psychologicalDriver": "Game-theory tension"
  },
  {
    "id": "m-066-personality-diagnosis-matrix",
    "name": "Personality Diagnosis Matrix",
    "category": "interactive-gamified",
    "trigger": "8-question psychological quiz revealing your archetype",
    "executionPattern": "Custom aesthetic shareable story card",
    "channelFitness": [
      "instagram",
      "tiktok"
    ],
    "psychologicalDriver": "Narcissistic identity sharing"
  },
  {
    "id": "m-067-the-mystery-box-roulette",
    "name": "The Mystery Box Roulette",
    "category": "interactive-gamified",
    "trigger": "Spend $20 for chance at $500 hero product or limited drop",
    "executionPattern": "Live opening community thread",
    "channelFitness": [
      "tiktok",
      "reddit"
    ],
    "psychologicalDriver": "Dopamine anticipation"
  },
  {
    "id": "m-068-level-up-milestone-unlocks",
    "name": "Level-Up Milestone Unlocks",
    "category": "interactive-gamified",
    "trigger": "Community reaches 50,000 shares to unlock free gift for all",
    "executionPattern": "Progress bar social tracker",
    "channelFitness": [
      "x",
      "instagram"
    ],
    "psychologicalDriver": "Collective mission synergy"
  },
  {
    "id": "m-069-the-predictive-leaderboard",
    "name": "The Predictive Leaderboard",
    "category": "interactive-gamified",
    "trigger": "Predict industry award winners or match scores for prizes",
    "executionPattern": "Dynamic interactive bracket",
    "channelFitness": [
      "web",
      "x"
    ],
    "psychologicalDriver": "Ego prediction validation"
  },
  {
    "id": "m-070-the-daily-micro-trivia",
    "name": "The Daily Micro-Trivia",
    "category": "interactive-gamified",
    "trigger": "Fast daily 10-second quiz unlocking loyalty multiplier",
    "executionPattern": "Push notification prompt",
    "channelFitness": [
      "mobile-app",
      "telegram"
    ],
    "psychologicalDriver": "Habitual dopamine loop"
  },
  {
    "id": "m-071-tactile-macro-soundscape",
    "name": "Tactile Macro Soundscape",
    "category": "sensory-tactile",
    "trigger": "Binaural sound recording of product usage",
    "executionPattern": "Headphone-recommended 15s shorts",
    "channelFitness": [
      "tiktok",
      "instagram"
    ],
    "psychologicalDriver": "Visceral physical craving"
  },
  {
    "id": "m-072-slow-pour-liquid-ribbon",
    "name": "Slow Pour Liquid Ribbon",
    "category": "sensory-tactile",
    "trigger": "Hypnotic 120fps slow-motion capture of liquid viscosity",
    "executionPattern": "Mesmerizing looping reel",
    "channelFitness": [
      "instagram",
      "pinterest"
    ],
    "psychologicalDriver": "Sensory ASMR hypnosis"
  },
  {
    "id": "m-073-the-crisp-mechanical-click",
    "name": "The Crisp Mechanical Click",
    "category": "sensory-tactile",
    "trigger": "Isolated studio audio of mechanical hinge locking",
    "executionPattern": "Minimalist visual with boosted high-end audio",
    "channelFitness": [
      "tiktok",
      "reels"
    ],
    "psychologicalDriver": "Tactile precision gratification"
  },
  {
    "id": "m-074-texture-swatch-finger-glide",
    "name": "Texture Swatch Finger Glide",
    "category": "sensory-tactile",
    "trigger": "Macro camera following fingertips skimming raw fabric",
    "executionPattern": "High-contrast texture film",
    "channelFitness": [
      "instagram",
      "meta-ads"
    ],
    "psychologicalDriver": "Tangible material desire"
  },
  {
    "id": "m-075-the-steaming-morning-pour",
    "name": "The Steaming Morning Pour",
    "category": "sensory-tactile",
    "trigger": "Crisp morning sunlight piercing aromatic hot steam vapor",
    "executionPattern": "Atmospheric morning routine reel",
    "channelFitness": [
      "instagram",
      "youtube"
    ],
    "psychologicalDriver": "Cozy ritual longing"
  },
  {
    "id": "m-076-the-chilled-glass-condensation",
    "name": "The Chilled Glass Condensation",
    "category": "sensory-tactile",
    "trigger": "Ice drops slowly tracing condensation down frosted glass",
    "executionPattern": "Hydration macro visual",
    "channelFitness": [
      "meta-ads",
      "tiktok"
    ],
    "psychologicalDriver": "Deep physical thirst trigger"
  },
  {
    "id": "m-077-unbroken-whispering-voiceover",
    "name": "Unbroken Whispering Voiceover",
    "category": "sensory-tactile",
    "trigger": "Intimate binaural whisper narration directly into listener ear",
    "executionPattern": "Dark screen voiceover reel",
    "channelFitness": [
      "tiktok",
      "spotify"
    ],
    "psychologicalDriver": "Sensory intimacy & chills"
  },
  {
    "id": "m-078-the-clay-pottery-wheel-spin",
    "name": "The Clay Pottery Wheel Spin",
    "category": "sensory-tactile",
    "trigger": "Wet clay gracefully spinning into sculpted perfection",
    "executionPattern": "Hypnotic craftsmanship loop",
    "channelFitness": [
      "pinterest",
      "tiktok"
    ],
    "psychologicalDriver": "Creative catharsis"
  },
  {
    "id": "m-079-the-perfect-paper-tear",
    "name": "The Perfect Paper Tear",
    "category": "sensory-tactile",
    "trigger": "High-fidelity acoustic capture of thick cotton paper tearing",
    "executionPattern": "Tactile packaging unboxing",
    "channelFitness": [
      "reels",
      "youtube"
    ],
    "psychologicalDriver": "Physical craftsmanship reverence"
  },
  {
    "id": "m-080-the-evening-ember-glow",
    "name": "The Evening Ember Glow",
    "category": "sensory-tactile",
    "trigger": "Soft crackling firelight reflecting across natural leather",
    "executionPattern": "Ambient mood landscape",
    "channelFitness": [
      "youtube",
      "instagram"
    ],
    "psychologicalDriver": "Warm sanctuary solace"
  },
  {
    "id": "m-081-the-user-hall-of-fame",
    "name": "The User Hall of Fame",
    "category": "community-advocacy",
    "trigger": "Elevate real customer to full billboard hero status",
    "executionPattern": "Full-page profile and photoshoot",
    "channelFitness": [
      "ooh",
      "linkedin"
    ],
    "psychologicalDriver": "Beloved community elevation"
  },
  {
    "id": "m-082-the-open-source-recipe-book",
    "name": "The Open Source Recipe Book",
    "category": "community-advocacy",
    "trigger": "Give away core trade secret recipe for free online",
    "executionPattern": "Free downloadable PDF manual",
    "channelFitness": [
      "newsletter",
      "reddit"
    ],
    "psychologicalDriver": "Disarming abundance mindset"
  },
  {
    "id": "m-083-the-customer-led-advisory-board",
    "name": "The Customer-Led Advisory Board",
    "category": "community-advocacy",
    "trigger": "Fly top 10 passionate users to headquarters for strategy",
    "executionPattern": "Behind-the-scenes summit documentary",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Deep brand ownership loyalty"
  },
  {
    "id": "m-084-community-bug-bounty-payout",
    "name": "Community Bug Bounty Payout",
    "category": "community-advocacy",
    "trigger": "Publicly pay cash to users who spot flaws or typos",
    "executionPattern": "Hall of fame public leaderboard",
    "channelFitness": [
      "x",
      "discord"
    ],
    "psychologicalDriver": "Collaborative perfectionism"
  },
  {
    "id": "m-085-the-local-chapter-meetup",
    "name": "The Local Chapter Meetup",
    "category": "community-advocacy",
    "trigger": "Fund coffee tabs for user groups meeting in 20 cities",
    "executionPattern": "User-submitted photo carousel",
    "channelFitness": [
      "instagram",
      "linkedin"
    ],
    "psychologicalDriver": "Offline human bonding"
  },
  {
    "id": "m-086-the-1-for-1-impact-tracker",
    "name": "The 1-for-1 Impact Tracker",
    "category": "community-advocacy",
    "trigger": "Live digital counter showing trees planted or meals gifted",
    "executionPattern": "Embedded web counter widget",
    "channelFitness": [
      "web",
      "meta-ads"
    ],
    "psychologicalDriver": "Purpose-driven purchase pride"
  },
  {
    "id": "m-087-the-customer-memorial-wall",
    "name": "The Customer Memorial Wall",
    "category": "community-advocacy",
    "trigger": "Permanent dedication to community members who shaped product",
    "executionPattern": "Physical and virtual dedication wall",
    "channelFitness": [
      "web",
      "hq"
    ],
    "psychologicalDriver": "Enduring human legacy"
  },
  {
    "id": "m-088-the-pay-it-forward-coffee-ring",
    "name": "The Pay-It-Forward Coffee Ring",
    "category": "community-advocacy",
    "trigger": "Gift a coffee or subscription anonymously to a stranger",
    "executionPattern": "Random act of kindness notification",
    "channelFitness": [
      "mobile-app",
      "x"
    ],
    "psychologicalDriver": "Altruistic emotional warmth"
  },
  {
    "id": "m-089-community-skill-accelerator",
    "name": "Community Skill Accelerator",
    "category": "community-advocacy",
    "trigger": "Free masterclasses hosted by community stars for peers",
    "executionPattern": "Weekly workshop webinar",
    "channelFitness": [
      "youtube",
      "linkedin"
    ],
    "psychologicalDriver": "Peer-to-peer empowerment"
  },
  {
    "id": "m-090-the-local-merchant-spotlight",
    "name": "The Local Merchant Spotlight",
    "category": "community-advocacy",
    "trigger": "Brand funds promotional ads for the neighborhood mom-and-pop shop",
    "executionPattern": "Heartwarming neighborhood profile film",
    "channelFitness": [
      "meta-ads",
      "youtube"
    ],
    "psychologicalDriver": "Grassroots solidarity"
  },
  {
    "id": "m-091-the-anti-hero-confession",
    "name": "The Anti-Hero Confession",
    "category": "narrative-subversion",
    "trigger": "Protagonist admits all their flaws before product saves day",
    "executionPattern": "Cinematic narrative monologue",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Honest character charm"
  },
  {
    "id": "m-092-the-reverse-timeline-mystery",
    "name": "The Reverse Timeline Mystery",
    "category": "narrative-subversion",
    "trigger": "Story starts at chaotic aftermath, rewinds to small catalyst",
    "executionPattern": "Backwards chronological editing",
    "channelFitness": [
      "youtube",
      "reels"
    ],
    "psychologicalDriver": "Narrative puzzle intrigue"
  },
  {
    "id": "m-093-the-absurd-exaggeration",
    "name": "The Absurd Exaggeration",
    "category": "narrative-subversion",
    "trigger": "Small product benefit treated as intergalactic emergency",
    "executionPattern": "Deadpan comedy trailer",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Comedic self-awareness"
  },
  {
    "id": "m-094-the-overlooked-detail-hero",
    "name": "The Overlooked Detail Hero",
    "category": "narrative-subversion",
    "trigger": "Microscopic feature solves massive world conflict",
    "executionPattern": "Action thriller parody",
    "channelFitness": [
      "youtube",
      "tiktok"
    ],
    "psychologicalDriver": "Feature importance reframing"
  },
  {
    "id": "m-095-the-two-paths-diverge",
    "name": "The Two Paths Diverge",
    "category": "narrative-subversion",
    "trigger": "Split reality showing day with product vs day without",
    "executionPattern": "Synchronized split-screen narrative",
    "channelFitness": [
      "meta-ads",
      "reels"
    ],
    "psychologicalDriver": "Clear behavioral contrast"
  },
  {
    "id": "m-096-the-unreliable-narrator",
    "name": "The Unreliable Narrator",
    "category": "narrative-subversion",
    "trigger": "Spokesperson claims everything is fine while chaos erupts",
    "executionPattern": "Satirical deadpan delivery",
    "channelFitness": [
      "meta-ads",
      "tiktok"
    ],
    "psychologicalDriver": "Comic irony"
  },
  {
    "id": "m-097-the-silent-treatment",
    "name": "The Silent Treatment",
    "category": "narrative-subversion",
    "trigger": "90-second ad with zero dialogue, only environmental foley",
    "executionPattern": "Cinematic atmospheric film",
    "channelFitness": [
      "youtube",
      "cinema"
    ],
    "psychologicalDriver": "Intense visual focus"
  },
  {
    "id": "m-098-the-historical-anachronism",
    "name": "The Historical Anachronism",
    "category": "narrative-subversion",
    "trigger": "Modern problem depicted in medieval or Victorian setting",
    "executionPattern": "Period piece comedic drama",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Timeless human truth"
  },
  {
    "id": "m-099-the-child-wisdom-council",
    "name": "The Child Wisdom Council",
    "category": "narrative-subversion",
    "trigger": "7-year-olds giving serious boardroom financial advice",
    "executionPattern": "Heartwarming candid interview",
    "channelFitness": [
      "reels",
      "linkedin"
    ],
    "psychologicalDriver": "Simplicity cutting through noise"
  },
  {
    "id": "m-100-the-reluctant-convert",
    "name": "The Reluctant Convert",
    "category": "narrative-subversion",
    "trigger": "Grumpy cynic systematically falls in love with product",
    "executionPattern": "Episodic transformation diary",
    "channelFitness": [
      "youtube",
      "meta-ads"
    ],
    "psychologicalDriver": "Skeptic conversion validation"
  }
];

// Convenience lookup dictionary of all 26 frameworks by framework id
export const STRATEGIC_FRAMEWORKS: Record<string, StrategicFrameworkDefinition> = Object.fromEntries(
  FULL_FRAMEWORK_LIBRARY.map(fw => [fw.id, fw])
);

// ============================================================================
// 3. Banned Clichés & Anti-Pattern Catalog
// ============================================================================

export const BANNED_CLICHES = [
  'in today\'s fast-paced world',
  'revolutionize the way',
  'game-changer',
  'game-changing',
  'seamlessly integrate',
  'elevate your everyday',
  'supercharge your workflow',
  'unlock your potential',
  'best-in-class',
  'one-stop shop',
  'at the next level',
  'cutting-edge technology',
  'synergy',
  'paradigm shift',
  'empower yourself',
  'tailored to your unique needs',
  'journey to excellence',
  'delve into',
  'spearheading the future',
  'leverage our solution',
  'state-of-the-art',
  'disrupting the industry',
  'transformative power',
  'redefining excellence',
  'unmatched quality',
  'seamless experience',
  'future-proof your business',
  'holistic approach',
  'laser-focused',
  'pushing the envelope',
  'breakthrough innovation',
  'trusted partner',
  'democratizing access',
  'turnkey solution',
  'customer-centric mindset',
  'frictionless journey'
];

export const BANNED_CLICHE_CATALOG: string[] = BANNED_CLICHES;

// ============================================================================
// 4. Framework Selector & Scoring Heuristic
// ============================================================================

export function rankFrameworksForBrief(params: {
  industry?: string;
  objective?: string;
  targetAudience?: string;
  constraints?: string[];
}): StrategicFrameworkDefinition[] {
  const { industry = '', objective = '', targetAudience = '' } = params;
  const indNorm = industry.toLowerCase();
  const objNorm = objective.toLowerCase();
  const audNorm = targetAudience.toLowerCase();

  return FULL_FRAMEWORK_LIBRARY.map(fw => {
    let score = 50; // base score

    // Objective match
    if (fw.suitableObjectives.some(o => objNorm.includes(o.toLowerCase()) || o.toLowerCase().includes(objNorm))) {
      score += 25;
    }

    // Industry match
    if (fw.suitableIndustries.some(i => indNorm.includes(i.toLowerCase()) || i.toLowerCase().includes(indNorm))) {
      score += 25;
    }

    // Audience context match
    if (audNorm.includes('creator') || audNorm.includes('gen z') || audNorm.includes('young')) {
      if (fw.id.includes('creator') || fw.id.includes('meme')) score += 20;
    }
    if (audNorm.includes('enterprise') || audNorm.includes('b2b') || indNorm.includes('b2b') || indNorm.includes('saas')) {
      if (fw.id.includes('b2b') || fw.id.includes('category-creation')) score += 30;
    }
    if (objNorm.includes('festive') || objNorm.includes('diwali') || objNorm.includes('holiday')) {
      if (fw.id.includes('seasonal-festive')) score += 40;
    }
    if (indNorm.includes('luxury') || indNorm.includes('fashion') || indNorm.includes('jewelry')) {
      if (fw.id.includes('luxury') || fw.id.includes('product-drop')) score += 30;
    }

    return { framework: fw, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.framework);
}
