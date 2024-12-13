// src/components/courses/CourseDetailModal.jsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function CourseDetailModal({ course, isOpen, onClose }) {
  if (!course) return null;

  const DifficultyMeter = ({ score }) => {
    // Convert score to a percentage for visual representation
    const percentage = Math.min((score / 30) * 100, 100); // Assuming max score of 30
    
    return (
      <div className="mt-2">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Difficulty Score: {score}
        </div>
      </div>
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                      {course.courseName}
                    </Dialog.Title>
                    
                    <div className="mt-4 space-y-6">
                      {/* Course Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Course ID</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.courseId}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Credit Hours</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.creditHours}</p>
                        </div>
                      </div>

                      {/* Course Description */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Description</h4>
                        <p className="mt-1 text-sm text-gray-900">{course.description}</p>
                      </div>

                      {/* Difficulty Score */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Course Difficulty</h4>
                        <DifficultyMeter score={course.difficultyScore || 0} />
                      </div>

                      {/* Prerequisites */}
                      {course.prerequisites?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Prerequisites</h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {course.prerequisites.map(prereq => (
                              <span
                                key={prereq}
                                className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-sm font-medium text-blue-700"
                              >
                                {prereq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Course Details */}
                      {course.details && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-3">Course Components</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Quizzes</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">
                                {course.details.numQuizzes || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Assignments</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">
                                {course.details.numAssignments || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Projects</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">
                                {course.details.numProjects ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Lab Component</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">
                                {course.details.isLab ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}