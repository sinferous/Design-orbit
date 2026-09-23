import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WorkEntryForm } from '@/components/work/WorkEntryForm';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

export default function NewWorkEntryPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#06080F] md:pl-64 lg:pl-68 pt-14 md:pt-0">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Add Daily Work Entry</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add deliverables to track time, manage quantities, and record daily progress.
          </p>
        </div>

        <Suspense fallback={
          <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800">
            <OrbitLoader size="md" text="Loading work form..." />
          </div>
        }>
          <WorkEntryForm />
        </Suspense>
      </main>
    </div>
  );
}
