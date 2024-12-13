const mongoose = require('mongoose');
const CourseV2 = require('../models/CourseV2');
const AvailableSectionV2 = require('../models/AvailableSectionV2');
require('dotenv').config();

const timeSlots = {
    'Sunday-Tuesday-Thursday': [
        '08:00 - 09:30',
        '09:30 - 11:00',
        '11:00 - 12:30',
        '12:30 - 14:00',
        '14:00 - 15:30'
    ],
    'Monday-Wednesday': [
        '08:00 - 09:30',
        '09:30 - 11:00',
        '11:00 - 12:30',
        '12:30 - 14:00',
        '14:00 - 15:30'
    ]
};

function generateSectionsForCourse(courseId, isRequiredCourse) {
    const sections = [];
    
    // All courses get at least two sections, one in each day pattern
    sections.push({
        section: '1',
        days: 'Sunday-Tuesday-Thursday',
        time: timeSlots['Sunday-Tuesday-Thursday'][Math.floor(Math.random() * timeSlots['Sunday-Tuesday-Thursday'].length)]
    });

    sections.push({
        section: '2',
        days: 'Monday-Wednesday',
        time: timeSlots['Monday-Wednesday'][Math.floor(Math.random() * timeSlots['Monday-Wednesday'].length)]
    });

    // Required courses get an additional section to provide more flexibility
    if (isRequiredCourse) {
        sections.push({
            section: '3',
            days: 'Sunday-Tuesday-Thursday',
            time: timeSlots['Sunday-Tuesday-Thursday'][Math.floor(Math.random() * timeSlots['Sunday-Tuesday-Thursday'].length)]
        });
    }

    return sections;
}

async function generateAvailableSections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const courses = await CourseV2.find({});
        console.log(`Found ${courses.length} courses to process`);

        const availableSections = {
            semester: '2024-1',
            courses: courses.map(course => {
                const isRequiredCourse = course.description === 'متطلبات التخصص الإجبارية' || 
                                      course.description === 'متطلبات الكلية الإجبارية';
                
                return {
                    courseId: course.courseId,
                    sections: generateSectionsForCourse(course.courseId, isRequiredCourse)
                };
            })
        };

        await AvailableSectionV2.findOneAndDelete({ semester: '2024-1' });
        const newSections = new AvailableSectionV2(availableSections);
        await newSections.save();

        console.log('Available sections generated successfully');
        console.log(`Total sections created: ${availableSections.courses.reduce((sum, course) => sum + course.sections.length, 0)}`);

        process.exit(0);
    } catch (error) {
        console.error('Error generating available sections:', error);
        process.exit(1);
    }
}

generateAvailableSections();