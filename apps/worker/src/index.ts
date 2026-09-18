/**
 * Writopedia Dedicated Persistent Background Worker.
 * Handles asynchronous background jobs for:
 * 1. AI Video Generation polling, asset downloads, storage uploads, and credit settlement
 * 2. Presentation PPTX/PDF rendering and storage uploads
 *
 * Runs as a standalone service on Railway (or containerized VM), completely decoupled
 * from Vercel's HTTP serverless lifecycle.
 */

import http from 'node:http';
import { videoJobWorker } from '../../api/src/modules/videoGeneration/videoJobWorker.js';
import { presentationExportWorker } from '../../api/src/modules/presentation/jobs/presentationExportWorker.js';
import { getSupabaseAdmin } from '../../api/src/infrastructure/supabase/supabaseClient.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting Writopedia Background Worker');
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log(`⚙️  Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');

  // Verify critical environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in worker environment.');
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ FATAL: Could not initialize Supabase Admin client.');
    process.exit(1);
  }

  // 1. Stale Job Reconciliation on Startup
  console.log('[Worker] Running startup stale job reconciliation...');
  try {
    await Promise.all([
      videoJobWorker.reconcileStaleJobs(),
      presentationExportWorker.reconcileStaleJobs()
    ]);
    console.log('[Worker] Stale job reconciliation completed.');
  } catch (err) {
    console.warn('[Worker] Warning during stale job reconciliation:', err);
  }

  // 2. Start Polling Workers
  console.log('[Worker] Starting VideoJobWorker (interval: 3000ms)...');
  videoJobWorker.start(3000);

  console.log('[Worker] Starting PresentationExportWorker (interval: 3000ms)...');
  presentationExportWorker.start(3000);

  // 3. Lightweight Health Check Server for Railway / Container orchestrators
  const healthServer = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/health' || url === '/' || url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'writopedia-worker',
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  healthServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Worker] Health monitor listening on http://0.0.0.0:${PORT}/health`);
    console.log('✅ Worker is online and processing jobs.');
  });

  // 4. Graceful Shutdown Handlers
  const shutdown = (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Initiating graceful shutdown...`);

    videoJobWorker.stop();
    presentationExportWorker.stop();

    healthServer.close(() => {
      console.log('[Worker] Health server closed. Exiting cleanly.');
      process.exit(0);
    });

    // Force exit if shutdown hangs beyond 10s
    setTimeout(() => {
      console.error('[Worker] Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ Unhandled worker startup exception:', err);
  process.exit(1);
});
