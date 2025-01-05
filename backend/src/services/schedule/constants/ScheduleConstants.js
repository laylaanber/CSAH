// Priority weights
const PRIORITIES = {
    GPA_IMPROVEMENT: 10,
    SPECIFIC_REQUESTS: 9,
    CREDIT_HOUR_REQUIREMENTS: 8,
    LABS_BALANCE: 7,
    CHAIN_PREREQUISITES: 6,
    CATEGORY_BALANCE: 5,
    DIFFICULTY_BALANCE: 4,
    PREFERRED_DAYS: 3,
    PREFERRED_BREAKS: 2
};

const DESIRED_PRIORITIES = {
    FAILED_COURSES: 50,
    IMPROVE_COURSES: 40,
    SPECIFIC_COURSES: 30,
    CHAIN_PREREQUISITES: 20,
    CATEGORY_BALANCE: 10,
    DIFFICULTY_BALANCE: 8,
    LABS_BALANCE: 6,
    PREFERRED_DAYS: 4,
    PREFERRED_BREAKS: 2
};

const FOUNDATION_PRIORITIES = {
    CHAIN_PREREQUISITES: 20,
    CREDIT_REQUIREMENTS: 15,
    GPA_IMPROVEMENT: 12,
    LABS_BALANCE: 10,
    CATEGORY_BALANCE: 8
};

// Academic constraints
const LAB_CONSTRAINTS = {
    MIN_LABS: 1,
    MAX_LABS: 3
};

const SEMESTER_CONSTRAINTS = {
    REGULAR: {
        minCredits: 12,
        maxCredits: 18,
        minLabs: 1
    },
    SUMMER: {
        minCredits: 0,
        maxCredits: 10,
        minLabs: 0
    }
};

const CATEGORY_CONSTRAINTS = {
    'متطلبات الجامعة الاختيارية': {
        maxCourses: 3,
        maxPerSubcategory: 1
    },
    'متطلبات التخصص الاختيارية': {
        maxCourses: 5
    }
};

// Course categorization
const COURSE_CATEGORIES = {
    UNIVERSITY_MANDATORY: 'متطلبات الجامعة الإجبارية',
    UNIVERSITY_ELECTIVE: 'متطلبات الجامعة الاختيارية',
    COLLEGE_MANDATORY: 'متطلبات الكلية الإجبارية',
    MAJOR_MANDATORY: 'متطلبات التخصص الإجبارية',
    MAJOR_ELECTIVE: 'متطلبات التخصص الاختيارية'
};

const UNIVERSITY_ELECTIVES = {
    GROUP1: {
        name: "المجموعة الاولى",
        courses: ["0400101", "2300101", "2300102", "3400108"]
    },
    GROUP2: {
        name: "المجموعة الثانية",
        courses: ["0310102", "0400102", "0720100", "1000102", "1100100"]
    },
    GROUP3: {
        name: "المجموعة الثالثة",
        courses: ["1600100", "1900101", "2000100", "2200103", "3400106"]
    }
};

// Special rules and constraints
const SPECIAL_COURSE_CONSTRAINTS = {
    '0977598': {
        minCreditHours: 120,
        noSummerAllowed: true,
        difficulty: 'HIGH'
    },
    '0977599': {
        noSummerAllowed: true,
        prerequisites: ['0977598'],
        difficulty: 'HIGH'
    },
    '0947500': {
        minCreditHours: 120,
        preferSummer: true,
        regularSemesterRules: {
            allowedWith: ['0977598', '0977599'],
            maxOtherCourses: 1
        },
        difficulty: 'MEDIUM'
    },
    '0901420': {
        minCreditHours: 90,
        difficulty: 'MEDIUM'
    }
};

// Difficulty and scheduling rules
const SCHEDULING_RULES = {
    SUMMER: {
        restricted_courses: ['0977598', '0977599'],
        preferred_courses: ['0947500']
    },
    BASIC_CATEGORIES: [
        'متطلبات الجامعة الاختيارية',
        'متطلبات الجامعة الإجبارية',
        'متطلبات إجبارية عامة'
    ],
    DIFFICULTY_BASE: {
        'متطلبات الجامعة الاختيارية': 0.01,
        'متطلبات الجامعة الإجبارية': 0.01,
        'متطلبات إجبارية عامة': 0.01,
        'متطلبات التخصص الإجبارية': 1.0,
        'متطلبات التخصص الاختيارية': 0.8
    }
};

// Feedback adjustments
const FEEDBACK_ADJUSTMENTS = {
    DAYS_PRIORITY: {
        high: 100,
        normal: 0,
        low: -50
    },
    BREAKS: {
        longer: { min: 30, priority: 40 },
        shorter: { min: 15, priority: 20 },
        no_preference: { min: 0, priority: 0 }
    },
    DIFFICULTY: {
        too_hard: { priority: -30, maxCoursesPerDay: 2 },
        good: { priority: 0, maxCoursesPerDay: 3 },
        too_easy: { priority: 30, maxCoursesPerDay: 4 }
    },
    LABS: {
        more: { min: 2, max: 3, priority: 50 },
        less: { min: 1, max: 1, priority: -50 },
        good: { min: 1, max: 2, priority: 0 }
    }
};

// Logging checkpoints
const LOG_CHECKPOINTS = {
    INIT: 'INITIALIZATION',
    FILTER: 'COURSE_FILTERING',
    PRIORITY: 'PRIORITIZATION',
    BUILD: 'SCHEDULE_BUILDING',
    VALIDATE: 'VALIDATION',
    COMPLETE: 'COMPLETION'
};

module.exports = {
    PRIORITIES,
    DESIRED_PRIORITIES,
    FOUNDATION_PRIORITIES,
    LAB_CONSTRAINTS,
    SEMESTER_CONSTRAINTS,
    CATEGORY_CONSTRAINTS,
    COURSE_CATEGORIES,
    UNIVERSITY_ELECTIVES,
    SPECIAL_COURSE_CONSTRAINTS,
    SCHEDULING_RULES,
    FEEDBACK_ADJUSTMENTS,
    LOG_CHECKPOINTS
};