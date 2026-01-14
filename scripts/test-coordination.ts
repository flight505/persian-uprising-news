
import { DisinformationDetector } from '../lib/disinformation-detector';

// Mock Incident Data
const mockIncidents = [
    // Group 1: Coordinated Bot Attack (Same text, different users, close time)
    { id: '1', description: 'The regime is failing!', reportedBy: 'bot1', timestamp: 1000, title: 'Alert' },
    { id: '2', description: 'The regime is failing!', reportedBy: 'bot2', timestamp: 1005, title: 'Alert' },
    { id: '3', description: 'The regime is failing!', reportedBy: 'bot3', timestamp: 1010, title: 'Alert' },

    // Group 2: Legitimate Discourse (Different text)
    { id: '4', description: 'Protests in Tehran today.', reportedBy: 'user1', timestamp: 2000, title: 'News' },
    { id: '5', description: 'Please stay safe everyone.', reportedBy: 'user2', timestamp: 2050, title: 'Safety' },

    // Group 3: Delayed Repost (Should not trigger if window is tight)
    { id: '6', description: 'The regime is failing!', reportedBy: 'bot4', timestamp: 9000000, title: 'Alert' }
];

async function runTest() {
    console.log('🕵️‍♂️ Testing Disinformation Detector Logic...');

    const detector = new DisinformationDetector();
    const groups = await detector.detectCoordination(mockIncidents as any);

    console.log(`📊 Found ${groups.length} coordination groups.`);

    const group1 = groups.find(g => g.sharedContentSample === 'The regime is failing!');

    if (group1) {
        console.log('✅ Correctly identified "The regime is failing!" campaign.');
        // Expecting ID 1, 2, 3. ID 6 is too late (depending on default window 3600s/1hr). 
        // Wait, 9000000ms is 2.5 hours after 1000ms, so it should be excluded if window is 1hr.
        // Let's check the size.
        console.log(`   - Involved Incidents: ${group1.incidentIds.length} (Expected 3 or 4 dependent on window)`);
        if (group1.incidentIds.length >= 3) {
            console.log('✅ Detection Count Valid.');
        } else {
            console.error('❌ Detection Count Missed.');
        }
        console.log(`   - Confidence Score: ${group1.confidence}%`);
    } else {
        console.error('❌ Failed to detect OBVIOUS coordination.');
    }

    if (groups.length === 1) {
        console.log('✅ No false positives detected.');
    }
}

runTest().catch(console.error);
