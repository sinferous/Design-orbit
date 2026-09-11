import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WorkEntryForm } from '@/components/work/WorkEntryForm';

export default function NewWorkEntryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Daily Work Entry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Add deliverables to track time, manage quantities, and record daily progress.
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading work form...</div>}>
          <WorkEntryForm />
        </Suspense>
      </main>
    </div>
  );
}
