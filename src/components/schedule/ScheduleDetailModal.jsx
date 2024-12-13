// src/components/schedule/ScheduleDetailModal.jsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function ScheduleDetailModal({ course, isOpen, onClose }) {
  if (!course) return null;

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
              <Dialog.Panel className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {course.courseName}
                    </Dialog.Title>
                    
                    <div className="mt-4 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Course ID</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.courseId}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Credit Hours</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.creditHours}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Days</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.days}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Time</h4>
                          <p className="mt-1 text-sm text-gray-900">{course.time}</p>
                        </div>
                      </div>

                      {course.details && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Course Details</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Projects</p>
                              <p className="mt-1 text-sm text-gray-900">{course.details.numProjects}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Quizzes</p>
                              <p className="mt-1 text-sm text-gray-900">{course.details.numQuizzes}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Assignments</p>
                              <p className="mt-1 text-sm text-gray-900">{course.details.numAssignments}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Exam Type</p>
                              <p className="mt-1 text-sm text-gray-900">{course.details.examType}</p>
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