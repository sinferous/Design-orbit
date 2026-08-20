'use client';

import { useState, useEffect, use } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WorkEntryForm } from '@/components/work/WorkEntryForm';
import { fetchWorkEntryById } from '@/lib/services/work-entry';
import { WorkEntryWithDetails } from '@/types';

interface EditWorkEntryPageProps {
  params: Promise<{ id: string }>;
}

export default function EditWorkEntryPage({ params }: EditWorkEntryPageProps) {
  const { id } = use(params);
  const [entry, setEntry] = useState<WorkEntryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntry() {
      try {
        const data = await fetchWorkEntryById(id);
        if (!data) {
          setError('Work entry not found.');
        } else {
          setEntry(data);
        }
      } catch (err) {
        setError('Failed to fetch entry details.');
      } finally {
        setLoading(false);
      }
    }
    loadEntry();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName="Gajesh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Work Entry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Update descriptions, quantities, links, or notes for this work item.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Loading entry details...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-600 font-medium">
            {error}
          </div>
        ) : (
          <WorkEntryForm initialData={entry} isEditMode={true} />
        )}
      </main>
    </div>
  );
}
