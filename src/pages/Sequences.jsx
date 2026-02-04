import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, Play, Pause, RefreshCw, Clock, Mail, Save, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Button, Input, Alert, Badge, Modal, TextArea, ConfirmDialog, PageLoader } from '../components/UI';
import { sequenceService } from '../services/supabase';

export default function Sequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Expanded sequence view
  const [expandedSequence, setExpandedSequence] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sequencesData = await sequenceService.getAll();
      setSequences(sequencesData);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  async function handleCreateSequence(sequenceData) {
    try {
      await sequenceService.create(sequenceData);
      setSuccess('Sequence created successfully');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      setError('Failed to create sequence: ' + err.message);
    }
  }

  async function handleUpdateSequence(sequenceData) {
    try {
      await sequenceService.update(editingSequence.id, sequenceData);
      setSuccess('Sequence updated successfully');
      setShowEditModal(false);
      setEditingSequence(null);
      loadData();
    } catch (err) {
      setError('Failed to update sequence: ' + err.message);
    }
  }

  async function handleDeleteSequence() {
    if (!deleteConfirm) return;
    
    try {
      await sequenceService.delete(deleteConfirm);
      setSuccess('Sequence deleted');
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError('Failed to delete sequence: ' + err.message);
    }
  }

  async function handleToggleActive(sequence) {
    try {
      await sequenceService.toggleActive(sequence.id, !sequence.is_active);
      loadData();
    } catch (err) {
      setError('Failed to update sequence: ' + err.message);
    }
  }

  function formatDelay(days, hours) {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    return parts.join(' ') || 'Immediately';
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Sequences</h2>
          <p className="text-gray-500 mt-1">Create multi-step automated email campaigns</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Sequence
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {/* Sequences List */}
      {sequences.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sequences Yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first email sequence to automate follow-up emails
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Sequence
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((sequence) => (
            <Card key={sequence.id} className="overflow-hidden">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-6 p-6"
                onClick={() => setExpandedSequence(
                  expandedSequence === sequence.id ? null : sequence.id
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    sequence.is_active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Mail className={`w-6 h-6 ${
                      sequence.is_active ? 'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{sequence.name}</h3>
                    <p className="text-sm text-gray-500">
                      {sequence.steps?.length || 0} steps • {sequence.contacts_enrolled || 0} contacts enrolled
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={sequence.is_active ? 'success' : 'default'}>
                    {sequence.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  {expandedSequence === sequence.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded View */}
              {expandedSequence === sequence.id && (
                <div className="border-t border-gray-100 mt-6 pt-6">
                  {/* Steps Timeline */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Email Steps</h4>
                    <div className="space-y-4">
                      {(sequence.steps || []).map((step, index) => (
                        <div key={step.id || index} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            {index < (sequence.steps?.length || 0) - 1 && (
                              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{step.subject}</h5>
                              <Badge variant="secondary" size="sm">
                                <Clock className="w-3 h-3 mr-1" />
                                {index === 0 ? 'Immediately' : `After ${formatDelay(step.delay_days, step.delay_hours)}`}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{step.body}</p>
                            {step.condition !== 'always' && (
                              <Badge variant="warning" size="sm" className="mt-2">
                                {step.condition === 'if_no_reply' ? 'Only if no reply' : 'Only if not opened'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {(!sequence.steps || sequence.steps.length === 0) && (
                        <p className="text-gray-500 text-sm italic">No steps added yet</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant={sequence.is_active ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(sequence);
                      }}
                    >
                      {sequence.is_active ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSequence(sequence);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(sequence.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <SequenceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateSequence}
        title="Create New Sequence"
      />

      {/* Edit Modal */}
      <SequenceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSequence(null);
        }}
        onSave={handleUpdateSequence}
        title="Edit Sequence"
        initialData={editingSequence}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteSequence}
        title="Delete Sequence"
        message="Are you sure you want to delete this sequence? All enrolled contacts will be removed from the sequence."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// Sequence Modal Component
function SequenceModal({ isOpen, onClose, onSave, title, initialData = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes or initial data changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setSteps(initialData.steps || []);
      } else {
        setName('');
        setDescription('');
        setSteps([]);
      }
    }
  }, [isOpen, initialData]);

  function addStep() {
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        subject: '',
        body: '',
        delay_days: steps.length === 0 ? 0 : 1,
        delay_hours: 0,
        condition: 'always',
      },
    ]);
  }

  function updateStep(index, field, value) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  }

  function removeStep(index) {
    const newSteps = steps.filter((_, i) => i !== index);
    // Update step numbers
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setSteps(newSteps);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (steps.length === 0) return;
    if (steps.some(s => !s.subject.trim() || !s.body.trim())) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        steps,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <Input
            label="Sequence Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Welcome Series, Follow-up Campaign"
          />
          <TextArea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this sequence for?"
            rows={2}
          />
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Email Steps</h4>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Mail className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No steps yet. Add your first email step.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {steps.map((step, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <Badge variant="default">Step {index + 1}</Badge>
                    </div>
                    <button
                      onClick={() => removeStep(index)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Subject Line"
                      value={step.subject}
                      onChange={(e) => updateStep(index, 'subject', e.target.value)}
                      placeholder="Email subject (supports {{variables}})"
                    />
                    <TextArea
                      label="Email Body"
                      value={step.body}
                      onChange={(e) => updateStep(index, 'body', e.target.value)}
                      placeholder="Email content (supports {{variables}})"
                      rows={3}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Wait Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={step.delay_days}
                          onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={index === 0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Wait Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={step.delay_hours}
                          onChange={(e) => updateStep(index, 'delay_hours', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={index === 0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition
                        </label>
                        <select
                          value={step.condition}
                          onChange={(e) => updateStep(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={index === 0}
                        >
                          <option value="always">Always send</option>
                          <option value="if_no_reply">If no reply</option>
                          <option value="if_no_open">If not opened</option>
                        </select>
                      </div>
                    </div>

                    {index === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        First email is sent immediately when contact is enrolled
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || steps.length === 0 || steps.some(s => !s.subject.trim() || !s.body.trim())}
          >
            <Save className="w-4 h-4 mr-2" />
            {initialData ? 'Update Sequence' : 'Create Sequence'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
