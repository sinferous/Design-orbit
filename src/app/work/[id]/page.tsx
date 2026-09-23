'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WorkEntryForm } from '@/components/work/WorkEntryForm';
import { fetchWorkEntryById, getLoggedInUser } from '@/lib/services/work-entry';
import { WorkEntryWithDetails } from '@/types';
import { OrbitLoader } from '@/components/ui/OrbitLoader';

interface EditWorkEntryPageProps {
  params: Promise<{ id: string }>;
}

export default function EditWorkEntryPage({ params }: EditWorkEntryPageProps) {
  const { id } = use(params);
  const [entry, setEntry] = useState<WorkEntryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('Team Member');

  useEffect(() => {
    const user = getLoggedInUser();
    if (user?.name) setUserName(user.name);

    async function loadEntry() {
      try {
        const data = await fetchWorkEntryById(id);
        if (!data) {
          setError('Work entry not found.');
        } else {
          if (user) {
            const isOwner =
              (user.profileId && data.user_id === user.profileId) ||
              (data.profile && data.profile.name.toLowerCase() === user.name.toLowerCase()) ||
              (data.profile && user.email && data.profile.email && data.profile.email.toLowerCase() === user.email.toLowerCase());

            if (!isOwner) {
              setError('Access Denied: You do not have permission to edit another team member’s work entry.');
              setLoading(false);
              return;
            }
          }
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
      <Navbar userName={userName} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Edit Work Entry</h1>
          <p className="text-sm text-slate-400 mt-1">
            Update descriptions, quantities, links, or notes for this work item.
          </p>
        </div>

        {loading ? (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
            <OrbitLoader
              size="md"
              text="Loading entry details..."
              subtitle="Fetching deliverable records from Supabase"
            />
          </div>
        ) : error ? (
          <div className="bg-slate-900 rounded-xl border border-red-900/50 p-8 text-center text-red-400 font-medium">
            {error}
          </div>
        ) : (
          <Suspense fallback={
            <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800">
              <OrbitLoader size="md" text="Loading form..." />
            </div>
          }>
            <WorkEntryForm initialData={entry} isEditMode={true} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
