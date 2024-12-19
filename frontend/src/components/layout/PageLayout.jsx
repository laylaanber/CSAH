import React from 'react';

export const PageLayout = ({ children, title, actions }) => {
  return (
    <div className="min-h-screen bg-uj-background">
      <div className="sticky top-0 z-50 bg-white shadow-md border-b border-uj-green/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-uj-green font-arabic">{title}</h1>
            </div>
            {actions}
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};