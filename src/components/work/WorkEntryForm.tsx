'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, WorkType, Client, WorkEntryWithDetails } from '@/types';
import { fetchProfiles, fetchWorkTypes, fetchClients, createWorkEntriesBatch, updateWorkEntry, getLoggedInUser } from '@/lib/services/work-entry';
import { Save, Plus, ArrowLeft, CheckCircle, AlertCircle, Trash2, Check, X, Building2, Link2 } from 'lucide-react';
import { ToastAlert } from '@/components/ui/ToastAlert';
import { useToast } from '@/components/ui/ToastContext';

interface WorkItemRow {
  id: string;
  work_type_id: string;
  description: string;
  quantity_done: number;
  quantity_approved: number;
  is_approved: boolean; // Approved vs Not Approved
  project_url?: string;
}

interface WorkEntryFormProps {
  initialData?: WorkEntryWithDetails | null;
  isEditMode?: boolean;
}

export function WorkEntryForm({ initialData, isEditMode = false }: WorkEntryFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(initialData?.user_id || '');
  const [workDate, setWorkDate] = useState<string>(initialData?.work_date || todayStr);
  const [selectedClientId, setSelectedClientId] = useState<string>(initialData?.client_id || '');

  // Work items for current client
  const [items, setItems] = useState<WorkItemRow[]>([
    {
      id: 'item_1',
      work_type_id: initialData?.work_type_id || '',
      description: initialData?.description || '',
      quantity_done: initialData?.quantity_done ?? 1,
      quantity_approved: initialData?.quantity_approved ?? 0,
      is_approved: (initialData?.status === 'Reviewed' || (initialData?.quantity_approved ?? 0) > 0),
      project_url: initialData?.project_url || initialData?.best_work_url || '',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [pData, wtData, cData] = await Promise.all([
          fetchProfiles(),
          fetchWorkTypes(),
          fetchClients(),
        ]);
        setProfiles(pData);
        setWorkTypes(wtData);
        setClients(cData);

        if (!initialData) {
          const user = getLoggedInUser();
          const matchedProfile = user 
            ? (pData.find(p => p.name.toLowerCase() === user.name.toLowerCase()) || pData[0])
            : pData[0];
          setSelectedUserId(matchedProfile?.id || pData[0]?.id || '');
          setSelectedClientId(cData[0]?.id || '');
          setItems([
            {
              id: 'item_1',
              work_type_id: wtData[0]?.id || '',
              description: '',
              quantity_done: 1,
              quantity_approved: 1,
              is_approved: true,
              project_url: '',
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load form options:', err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadFormOptions();
  }, [initialData]);

  const addItemRow = () => {
    const defaultWorkType = workTypes[0]?.id || '';
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length}`,
        work_type_id: defaultWorkType,
        description: '',
        quantity_done: 1,
        quantity_approved: 1,
        is_approved: true,
        project_url: '',
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemRow = (id: string, fields: Partial<WorkItemRow>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...fields };

        // Default quantity_approved when is_approved status button is clicked if not explicitly provided
        if (fields.is_approved !== undefined && fields.quantity_approved === undefined) {
          updated.quantity_approved = fields.is_approved ? updated.quantity_done : 0;
        }
        return updated;
      })
    );
  };

  const validate = () => {
    if (!selectedUserId) return 'Please select a team member.';
    if (!selectedClientId) return 'Please select a Client Name.';
    if (items.length === 0) return 'Please add at least one work item.';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.work_type_id) return `Item #${i + 1}: Please select a work type.`;
      if (!item.description.trim()) return `Item #${i + 1}: Please enter a description.`;
      if (item.quantity_done < 0) return `Item #${i + 1}: Quantity cannot be negative.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent, addAnotherClient = false) => {
    e.preventDefault();
    const valErr = validate();
    if (valErr) {
      setError(valErr);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isEditMode && initialData?.id) {
        const item = items[0];
        await updateWorkEntry(initialData.id, {
          user_id: selectedUserId,
          client_id: selectedClientId,
          work_type_id: item.work_type_id,
          work_date: workDate,
          description: item.description,
          quantity_done: item.quantity_done,
          quantity_approved: item.quantity_approved,
          project_url: item.project_url || undefined,
          best_work_url: item.project_url || undefined,
          status: item.is_approved ? 'Reviewed' : 'Submitted',
        });
        showToast('Work entry updated successfully!', 'success');
        setTimeout(() => router.push('/work'), 600);
      } else {
        const payload = items.map(item => ({
          user_id: selectedUserId,
          client_id: selectedClientId,
          work_type_id: item.work_type_id,
          work_date: workDate,
          description: item.description,
          quantity_done: item.quantity_done,
          quantity_approved: item.quantity_approved,
          project_url: item.project_url || undefined,
          best_work_url: item.project_url || undefined,
          status: (item.is_approved ? 'Reviewed' : 'Submitted') as any,
        }));

        await createWorkEntriesBatch(payload);

        if (addAnotherClient) {
          showToast(`Saved ${items.length} work item(s)! Ready for another client.`, 'success');
          const currentIndex = clients.findIndex(c => c.id === selectedClientId);
          const nextClient = clients[(currentIndex + 1) % clients.length];
          if (nextClient) setSelectedClientId(nextClient.id);

          setItems([
            {
              id: `item_${Date.now()}`,
              work_type_id: workTypes[0]?.id || '',
              description: '',
              quantity_done: 1,
              quantity_approved: 1,
              is_approved: true,
              project_url: '',
            },
          ]);
        } else {
          showToast(`Successfully saved ${items.length} work entry item(s)!`, 'success');
          setTimeout(() => router.push('/work'), 600);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save work entries.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading form options...</p>
      </div>
    );
  }

  const activeClientObj = clients.find(c => c.id === selectedClientId);
  const activeUserObj = profiles.find(p => p.id === selectedUserId);

  return (
    <>
      <ToastAlert message={error} type="error" onClose={() => setError(null)} />
      <ToastAlert message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />

      <form className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">

      {/* Auto User & System Date Bar */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm border border-sky-200">
            {activeUserObj?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logging Work As</div>
            <div className="text-sm font-bold text-slate-900">
              {activeUserObj?.name || 'Gajesh'}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                ({activeUserObj?.designation || 'UI/UX'})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">System Date:</span>
          <input
            type="date"
            required
            value={workDate}
            onChange={e => setWorkDate(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* 1. FIRST FIELD: Client Name Dropdown */}
      <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-200 space-y-3">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-900">
            1. Client Name *
          </label>
        </div>

        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-sky-300 rounded-lg text-base font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="" disabled>-- Select Client --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. WORK ITEMS LIST FOR SELECTED CLIENT */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Work Items for {activeClientObj?.name || 'Selected Client'} ({items.length})
          </h3>
          {!isEditMode && (
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Item for this Client</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Item #{index + 1}
                </span>

                {items.length > 1 && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Work Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Type *
                  </label>
                  <select
                    value={item.work_type_id}
                    onChange={e => updateItemRow(item.id, { work_type_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {workTypes.map(wt => (
                      <option key={wt.id} value={wt.id}>
                        {wt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Statics or 1 Video homepage edit"
                    value={item.description}
                    onChange={e => updateItemRow(item.id, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quantity Done *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={item.quantity_done}
                    onChange={e => updateItemRow(item.id, { quantity_done: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Approved Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Approved Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={item.quantity_approved}
                    onChange={e => updateItemRow(item.id, { quantity_approved: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Submission Status: Only Approved or Not Approved */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Submission Status *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateItemRow(item.id, { is_approved: true })}
                      className={`flex items-center justify-center space-x-1 py-2 px-2 rounded-lg text-xs font-bold transition-colors border ${
                        item.is_approved
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateItemRow(item.id, { is_approved: false })}
                      className={`flex items-center justify-center space-x-1 py-2 px-2 rounded-lg text-xs font-bold transition-colors border ${
                        !item.is_approved
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Not Approved</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Project URL (Optional) */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Project URL</span>
                    <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Figma, Behance, Drive, or site link</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://figma.com/file/... or https://..."
                    value={item.project_url || ''}
                    onChange={e => updateItemRow(item.id, { project_url: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/60 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/work')}
          className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {!isEditMode && (
            <button
              type="button"
              disabled={submitting}
              onClick={e => handleSubmit(e, true)}
              className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-4 py-2.5 text-sm font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Add For Another Client</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            onClick={e => handleSubmit(e, false)}
            className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEditMode ? 'Update Entry' : `Save ${items.length} Work Item(s)`}</span>
          </button>
        </div>
      </div>
    </form>
  </>
);
}
