
import { MediaDeduplication } from '../lib/media-deduplication';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function runBenchmark() {
    console.log('🚀 Starting Media Deduplication Benchmark...');

    // create dummy images if none exist
    const testDir = path.join(process.cwd(), 'benchmark_temp');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

    const generateImage = async (filename: string, color: string) => {
        await sharp({
            create: {
                width: 800,
                height: 600,
                channels: 3,
                background: color
            }
        })
            .jpeg()
            .toFile(path.join(testDir, filename));
    };

    console.log('📸 Generating 10 test images...');
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff', '#000000', '#123456', '#abcdef'];
    for (let i = 0; i < 10; i++) {
        await generateImage(`test_${i}.jpg`, colors[i]);
    }

    // Benchmark Hashing
    console.log('⚡ Benchmarking Hashing Speed...');
    const dedupe = new MediaDeduplication();
    const start = performance.now();

    const hashes = [];
    for (let i = 0; i < 10; i++) {
        const buffer = fs.readFileSync(path.join(testDir, `test_${i}.jpg`));
        const hash = await dedupe.generatePHash(buffer);
        hashes.push(hash);
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / 10;

    console.log(`✅ Processed 10 images in ${totalTime.toFixed(2)}ms`);
    console.log(`📊 Average Hash Time: ${avgTime.toFixed(2)}ms per image`);

    if (avgTime > 200) {
        console.warn('⚠️ Hashing is slower than expected (>200ms). sharp optimization might be needed.');
    } else {
        console.log('✅ Performance is optimal.');
    }

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
}

runBenchmark().catch(console.error);
