import { execSync } from 'child_process';
import * as path from 'path';

async function runAllSeeds() {
  const seeds = [
    'seed-core.ts',
    'seed-menu.ts',
    'seed-attendance-all.ts',
    'seed-lms.ts',
    'seed-extended.ts',
    'seed-health.ts'
  ];

  console.log('🚀 Starting FULL MASTER SEED (Restoring High-Quality Data)...\n');

  for (const seed of seeds) {
    console.log(`▶️  Running ${seed}...`);
    try {
      execSync(`npx ts-node "${path.join(__dirname, seed)}"`, { stdio: 'inherit' });
      console.log(`✅ Finished ${seed}\n`);
    } catch (error) {
      console.error(`❌ Error running ${seed}:`, error.message);
      // Don't exit on health if it's just one student, but core/lms/menu are critical
      if (['seed-core.ts', 'seed-lms.ts', 'seed-menu.ts'].includes(seed)) {
        process.exit(1);
      }
    }
  }

  console.log('🎉 MISSION ACCOMPLISHED: Your database is restored with premium data!');
}

runAllSeeds();
