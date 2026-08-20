import { Navbar } from '@/components/layout/Navbar';
import { WorkEntryForm } from '@/components/work/WorkEntryForm';

export default function NewWorkEntryPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Daily Work Entry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Log your completed work, quantities, and links for daily tracking and weekly report aggregation.
          </p>
        </div>

        <WorkEntryForm />
      </main>
    </div>
  );
}
