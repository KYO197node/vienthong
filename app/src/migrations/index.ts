import * as migration_20260828_175727_baseline from './20260828_175727_baseline';
import * as migration_20260901_060739_add_billing_cycle from './20260901_060739_add_billing_cycle';

export const migrations = [
  {
    up: migration_20260828_175727_baseline.up,
    down: migration_20260828_175727_baseline.down,
    name: '20260828_175727_baseline',
  },
  {
    up: migration_20260901_060739_add_billing_cycle.up,
    down: migration_20260901_060739_add_billing_cycle.down,
    name: '20260901_060739_add_billing_cycle'
  },
];
