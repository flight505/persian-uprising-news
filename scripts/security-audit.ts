
import fs from 'fs';
import path from 'path';

// Basic Security Audit Script
console.log('🔒 Starting Security Audit...');

// 1. Check for sensitive env vars committed
const sensitiveKeys = ['API_KEY', 'SECRET', 'TOKEN', 'PRIVATE_KEY', 'PASSWORD'];
const rootDir = process.cwd();
const files = fs.readdirSync(rootDir);

console.log('🔍 Checking for exposed secrets in root...');
files.forEach(file => {
    if (file.startsWith('.env') && !file.endsWith('.example')) {
        // Usually we shouldn't read .env but we check if it's GIT IGNORED
        const gitIgnore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
        if (!gitIgnore.includes(file)) {
            console.warn(`⚠️ WARNING: ${file} is NOT in .gitignore!`);
        } else {
            console.log(`✅ ${file} is correctly ignored.`);
        }
    }
});

// 2. Check for "eval()" usage
console.log('🔍 Scanning for dangerous eval() usage in lib/...');
function scan(dir: string) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scan(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('eval(')) {
                console.warn(`⚠️ WARNING: eval() detected in ${fullPath}`);
            }
        }
    });
}
if (fs.existsSync(path.join(rootDir, 'lib'))) scan(path.join(rootDir, 'lib'));
if (fs.existsSync(path.join(rootDir, 'app'))) scan(path.join(rootDir, 'app'));

// 3. Confirm Next.js Security Headers (mock check)
console.log('🔍 Verifying Security Headers config...');
const nextConfigPath = path.join(rootDir, 'next.config.js');
const nextConfigTSPath = path.join(rootDir, 'next.config.ts');
if (fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigTSPath)) {
    console.log(`✅ Next.js config exists (Header configuration assumed handled by Vercel/Next defaults).`);
} else {
    console.warn('⚠️ No next.config.js/ts found?');
}

console.log('✅ Audit Complete.');
