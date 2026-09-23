'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, WorkType, Client, WorkEntryWithDetails, WorkStatus } from '@/types';
import {
  fetchProfiles,
  fetchWorkTypes,
  fetchClients,
  createWorkEntriesBatch,
  updateWorkEntry,
  getLoggedInUser,
  isInProgressEntry,
} from '@/lib/services/work-entry';
import { Save, Plus, ArrowLeft, CheckCircle, AlertCircle, Trash2, Check, X, Building2, Link2, Hourglass } from 'lucide-react';
import { ToastAlert } from '@/components/ui/ToastAlert';
import { useToast } from '@/components/ui/ToastContext';
import { RichSelect } from '@/components/ui/RichSelect';
import { RichDatePicker } from '@/components/ui/RichDatePicker';
import { OrbitLoader } from '@/components/ui/OrbitLoader';
import { triggerTinyConfetti } from '@/lib/utils/confetti';

interface WorkItemRow {
  id: string;
  work_type_id: string;
  description: string;
  quantity_done: number;
  quantity_approved: number;
  is_approved: boolean; // Approved vs Not Approved
  project_url?: string;
  is_in_progress?: boolean;
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

  const initialIsInProgress = initialData ? (initialData.status === 'Draft' || initialData.quantity_done === 0 || isInProgressEntry(initialData)) : false;

  // Work items for current client
  const [items, setItems] = useState<WorkItemRow[]>([
    {
      id: 'item_1',
      work_type_id: initialData?.work_type_id || '',
      description: initialData?.description || '',
      quantity_done: initialData?.quantity_done ?? (initialIsInProgress ? 0 : 1),
      quantity_approved: initialData?.quantity_approved ?? 0,
      is_approved: (initialData?.status === 'Reviewed' || (initialData?.quantity_approved ?? 0) > 0),
      project_url: initialData?.project_url || initialData?.best_work_url || '',
      is_in_progress: initialIsInProgress,
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

        const user = getLoggedInUser();
        const matchedProfile = user 
          ? (pData.find(p => p.name.toLowerCase() === user.name.toLowerCase()) || pData[0])
          : pData[0];
        const resolvedUserId = initialData?.user_id || matchedProfile?.id || pData[0]?.id || '';
        if (!initialData) {
          setSelectedUserId(resolvedUserId);
          setSelectedClientId(cData[0]?.id || '');
        }

        if (!initialData) {
          setItems([
            {
              id: 'item_1',
              work_type_id: wtData[0]?.id || '',
              description: '',
              quantity_done: 1,
              quantity_approved: 0,
              is_approved: false,
              project_url: '',
              is_in_progress: false,
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
  }, [initialData, isEditMode]);

  const addItemRow = () => {
    const defaultWorkType = workTypes[0]?.id || '';
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length}`,
        work_type_id: defaultWorkType,
        description: '',
        quantity_done: 1,
        quantity_approved: 0,
        is_approved: false,
        project_url: '',
        is_in_progress: false,
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

        let newIsInProgress =
          fields.is_in_progress !== undefined ? fields.is_in_progress : item.is_in_progress;

        let newQuantityDone =
          fields.quantity_done !== undefined
            ? Math.max(0, fields.quantity_done)
            : item.quantity_done;

        let newQuantityApproved =
          fields.quantity_approved !== undefined
            ? Math.max(0, fields.quantity_approved)
            : item.quantity_approved;

        let newIsApproved =
          fields.is_approved !== undefined ? fields.is_approved : item.is_approved;

        // When toggled to In-Progress (Continue Tomorrow), quantity is 0
        if (fields.is_in_progress !== undefined) {
          if (fields.is_in_progress) {
            newQuantityDone = 0;
            newQuantityApproved = 0;
            newIsApproved = false;
          } else {
            if (newQuantityDone === 0) newQuantityDone = 1;
          }
        }

        // 1. User toggled the submission status buttons explicitly
        if (fields.is_approved !== undefined && fields.quantity_approved === undefined && !newIsInProgress) {
          if (fields.is_approved) {
            newQuantityApproved = newQuantityDone > 0 ? newQuantityDone : 1;
            if (newQuantityDone < 1) newQuantityDone = 1;
            newIsApproved = true;
          } else {
            newQuantityApproved = 0;
            newIsApproved = false;
          }
        }

        // 2. User changed Quantity Done
        if (fields.quantity_done !== undefined && !newIsInProgress) {
          if (newQuantityApproved > newQuantityDone) {
            newQuantityApproved = newQuantityDone;
          }
          if (newQuantityApproved === 0) {
            newIsApproved = false;
          }
        }

        // 3. User changed Approved Quantity
        if (fields.quantity_approved !== undefined && !newIsInProgress) {
          if (newQuantityApproved > newQuantityDone) {
            newQuantityApproved = newQuantityDone;
          }
          if (newQuantityApproved === 0) {
            newIsApproved = false;
          } else {
            newIsApproved = true;
          }
        }

        return {
          ...item,
          ...fields,
          quantity_done: newQuantityDone,
          quantity_approved: newQuantityApproved,
          is_approved: newIsApproved,
          is_in_progress: newIsInProgress,
        };
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

      // If finished deliverable, quantity must be at least 1
      if (!item.is_in_progress && item.quantity_done < 1) {
        return `Item #${i + 1}: Quantity must be at least 1 when marked Completed.`;
      }
      if (!item.is_in_progress && item.quantity_approved > item.quantity_done) {
        return `Item #${i + 1}: Approved Quantity (${item.quantity_approved}) cannot exceed Quantity (${item.quantity_done}).`;
      }
      if (!item.is_in_progress && item.is_approved && item.quantity_approved <= 0) {
        return `Item #${i + 1}: Status is marked Approved, so Approved Quantity must be at least 1.`;
      }
      if (!item.is_in_progress && !item.is_approved && item.quantity_approved > 0) {
        return `Item #${i + 1}: Status is Not Approved, so Approved Quantity must be 0.`;
      }
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
        const statusVal: WorkStatus = item.is_in_progress ? 'Draft' : item.is_approved ? 'Reviewed' : 'Submitted';

        await updateWorkEntry(initialData.id, {
          user_id: selectedUserId,
          client_id: selectedClientId,
          work_type_id: item.work_type_id,
          work_date: workDate,
          description: item.description,
          quantity_done: item.is_in_progress ? 0 : item.quantity_done,
          quantity_approved: item.is_in_progress ? 0 : item.quantity_approved,
          project_url: item.project_url || undefined,
          best_work_url: item.project_url || undefined,
          status: statusVal,
        });
        const wasNotApproved = (initialData.quantity_approved || 0) === 0;
        const isNowApproved = item.is_approved && item.quantity_approved > 0;
        if (wasNotApproved && isNowApproved) {
          triggerTinyConfetti();
        }

        showToast('Work entry updated successfully!', 'success');
        setTimeout(() => router.push('/work'), 600);
      } else {
        const payload = items.map(item => {
          const statusVal: WorkStatus = item.is_in_progress ? 'Draft' : item.is_approved ? 'Reviewed' : 'Submitted';

          return {
            user_id: selectedUserId,
            client_id: selectedClientId,
            work_type_id: item.work_type_id,
            work_date: workDate,
            description: item.description,
            quantity_done: item.is_in_progress ? 0 : item.quantity_done,
            quantity_approved: item.is_in_progress ? 0 : item.quantity_approved,
            project_url: item.project_url || undefined,
            best_work_url: item.project_url || undefined,
            status: statusVal,
          };
        });

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
              quantity_approved: 0,
              is_approved: false,
              project_url: '',
              is_in_progress: false,
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
      <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800">
        <OrbitLoader
          size="md"
          text="Loading form options..."
          subtitle="Fetching active clients and deliverable types"
        />
      </div>
    );
  }

  const activeClientObj = clients.find(c => c.id === selectedClientId);
  const activeUserObj = profiles.find(p => p.id === selectedUserId);

  return (
    <>
      <ToastAlert message={error} type="error" onClose={() => setError(null)} />
      <ToastAlert message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />

      <form className="bento-card p-6 sm:p-8 space-y-6 text-slate-100">

      {/* Auto User & System Date Bar */}
      <div className="bg-black/30 border border-white/[0.08] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/15 text-violet-300 font-bold flex items-center justify-center text-sm border border-violet-500/25">
            {activeUserObj?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logging Work As</div>
            <div className="text-sm font-bold text-slate-100">
              {activeUserObj?.name || 'Gajesh'}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                ({activeUserObj?.designation || 'UI/UX'})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">System Date:</span>
          <RichDatePicker
            value={workDate}
            onChange={dStr => setWorkDate(dStr)}
            size="sm"
          />
        </div>
      </div>

      {/* 1. FIRST FIELD: Client Name Dropdown */}
      <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/60 space-y-3">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-violet-300">
            1. Client Name *
          </label>
        </div>

        <RichSelect
          value={selectedClientId}
          onChange={val => setSelectedClientId(val)}
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          placeholder="-- Select Client --"
          size="lg"
          searchable
          triggerClassName="border-violet-700 bg-slate-900 text-slate-100"
        />
      </div>

      {/* 2. WORK ITEMS LIST FOR SELECTED CLIENT */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            2. Work Items for {activeClientObj?.name || 'Selected Client'} ({items.length})
          </h3>
          {!isEditMode && (
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-violet-300 bg-violet-950/60 border border-violet-800/60 hover:bg-violet-900/60 rounded-lg transition-colors cursor-pointer"
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
              className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 transition-all space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Item #{index + 1}
                </span>

                {items.length > 1 && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Work Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Work Type *
                  </label>
                  <RichSelect
                    value={item.work_type_id}
                    onChange={val => updateItemRow(item.id, { work_type_id: val })}
                    options={workTypes.map(wt => ({ value: wt.id, label: wt.name }))}
                    placeholder="Select Work Type"
                    size="md"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Statics or 1 Video homepage edit"
                    value={item.description}
                    onChange={e => updateItemRow(item.id, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Switcher: Completed vs Working */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-300">Status:</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => updateItemRow(item.id, { is_in_progress: false, quantity_done: item.quantity_done || 1 })}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        !item.is_in_progress
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ✓ Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItemRow(item.id, { is_in_progress: true, quantity_done: 0, quantity_approved: 0, is_approved: false })}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        item.is_in_progress
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⏳ Working
                    </button>
                  </div>
                </div>

                {item.is_in_progress ? (
                  <span className="text-[11px] text-amber-400 font-medium">
                    (Working adds time today &bull; Details in description)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Finished deliverable (counted in reports)
                  </span>
                )}
              </div>

              {/* Fields: Quantity & Project URL */}
              {!item.is_in_progress ? (
                !isEditMode ? (
                  /* Creation Mode */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={item.quantity_done}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          updateItemRow(item.id, { quantity_done: isNaN(val) ? 0 : val });
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <Link2 className="w-3.5 h-3.5 text-violet-400" />
                          <span>Project URL</span>
                          <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          placeholder="https://figma.com/file/... or https://..."
                          value={item.project_url || ''}
                          onChange={e => updateItemRow(item.id, { project_url: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none placeholder:text-slate-500"
                        />
                        <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity_done}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            updateItemRow(item.id, { quantity_done: isNaN(val) ? 0 : val });
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Approved Quantity</span>
                          <span className="text-[10px] text-slate-400 font-semibold">Max: {item.quantity_done}</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity_done}
                          required
                          value={item.quantity_approved}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            updateItemRow(item.id, { quantity_approved: isNaN(val) ? 0 : val });
                          }}
                          className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-sm font-bold text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none transition-colors ${
                            item.quantity_approved > 0
                              ? 'border-emerald-500/60 bg-emerald-950/20'
                              : 'border-slate-700'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Approval Status *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemRow(item.id, { is_approved: true })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              item.is_approved
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700 shadow-xs'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${item.is_approved ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span>Approved</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateItemRow(item.id, { is_approved: false })}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              !item.is_approved
                                ? 'bg-amber-950/70 text-amber-300 border-amber-700 shadow-xs'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            <X className={`w-3.5 h-3.5 ${!item.is_approved ? 'text-amber-400' : 'text-slate-500'}`} />
                            <span>Not Approved</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <Link2 className="w-3.5 h-3.5 text-violet-400" />
                          <span>Project URL</span>
                          <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          placeholder="https://figma.com/file/... or https://..."
                          value={item.project_url || ''}
                          onChange={e => updateItemRow(item.id, { project_url: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none placeholder:text-slate-500"
                        />
                        <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  </>
                )
              ) : (
                /* Working mode: Just Project URL */
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Link2 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Project URL</span>
                      <span className="text-[10px] font-normal text-slate-400">(Optional link)</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://figma.com/file/... or https://..."
                      value={item.project_url || ''}
                      onChange={e => updateItemRow(item.id, { project_url: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none placeholder:text-slate-500"
                    />
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/work')}
          className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
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
              className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-4 py-2.5 text-sm font-bold text-violet-300 bg-violet-950/60 border border-violet-800 hover:bg-violet-900/60 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Add For Another Client</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            onClick={e => handleSubmit(e, false)}
            className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white webtree-gradient-btn rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
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
