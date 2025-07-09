import { rmSync, cpSync } from 'fs';
import { execSync } from 'child_process';

// Delete old dist
rmSync('dist', { recursive: true, force: true });

// Run tsup
execSync('tsup', { stdio: 'inherit' });

// Copy UI folder
cpSync('src/ui', 'dist/ui', { recursive: true });
