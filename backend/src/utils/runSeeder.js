// utils/runSeeder.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const seedCourses = require('./courseSeeder');

async function runSeeder() {
    try {
        // Import course data
        const coursesData = require('../data/courses.json');
        
        console.log('Starting course data seeding...');
        const result = await seedCourses(coursesData);
        
        if (result.success) {
            console.log('\n✅ Seeding completed successfully!');
        }
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

// Run the seeder
runSeeder();