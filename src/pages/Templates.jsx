import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit, Upload, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { Card, Button, Input, TextArea, Modal, Alert, ConfirmDialog, PageLoader, DuplicateDialog } from '../components/UI';
import { templatesService } from '../services/supabase';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sanitizeAndFormat, findDuplicateTemplates } from '../utils';

const ITEMS_PER_PAGE = 10;

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
  
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef(null);
  
  // Duplicate detection state
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    duplicates: [],
    duplicatesWithExisting: [],
    uniqueTemplates: [],
  });
  
  // AI Generation state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    purpose: 'sales_outreach',
    customPurpose: '',
    industry: '',
    tone: 'professional',
    audience: '',
    keyPoints: [''],
    availableFields: ['email'], // Default to email only
  });
  const [aiPreview, setAiPreview] = useState(null);

  // Available personalization fields
  const PERSONALIZATION_FIELDS = [
    { id: 'email', label: 'Email', always: true },
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'company', label: 'Company' },
    { id: 'position', label: 'Position/Title' },
  ];
  const { user } = useAuth();

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

  const loadTemplates = useCallback(async () => {
    try {
      const data = await templatesService.getAll();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Pagination logic
  const { paginatedTemplates, totalPages } = useMemo(() => {
    const total = Math.ceil(templates.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = templates.slice(start, start + ITEMS_PER_PAGE);
    return { paginatedTemplates: paginated, totalPages: total };
  }, [templates, currentPage]);

  // Reset to page 1 when templates change significantly
  useEffect(() => {
    if (currentPage > 1 && templates.length <= (currentPage - 1) * ITEMS_PER_PAGE) {
      setCurrentPage(1);
    }
  }, [templates.length, currentPage]);

  function openAddModal() {
    setEditId(null);
    setFormData({ name: '', subject: '', body: '' });
    setIsModalOpen(true);
  }

  function openEditModal(template) {
    setEditId(template.id);
    setFormData({ 
      name: template.name || '', 
      subject: template.subject, 
      body: template.body 
    });
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formData.subject.trim() || !formData.body.trim()) {
      setError('Subject and body are required');
      return;
    }

    // Check for duplicates when adding new template (not editing)
    if (!editId) {
      const duplicateCheck = findDuplicateTemplates([formData], templates);
      if (duplicateCheck.duplicatesWithExisting.length > 0) {
        setError('A template with the same subject and body already exists');
        return;
      }
    }

    setSaving(true);
    try {
      if (editId) {
        await templatesService.update(editId, formData);
        setSuccess('Template updated successfully');
      } else {
        await templatesService.add(formData);
        setSuccess('Template added successfully');
      }
      await loadTemplates();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await templatesService.delete(id);
      await loadTemplates();
      setSuccess('Template deleted successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
      setDeleteConfirm({ open: false, id: null });
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await templatesService.deleteAll();
      setTemplates([]);
      setSuccess('All templates deleted successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingAll(false);
      setDeleteAllConfirm(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const text = await file.text();
      let templatesArray = [];
      
      // Check if it's a CSV file
      if (file.name.toLowerCase().endsWith('.csv')) {
        templatesArray = parseCSV(text);
      } else {
        // Try JSON format (backward compatibility)
        const imported = JSON.parse(text);
        templatesArray = Array.isArray(imported) ? imported : [imported];
      }
      
      if (templatesArray.length === 0) {
        throw new Error('No templates found in file');
      }
      
      // Check for duplicates
      const duplicateCheck = findDuplicateTemplates(templatesArray, templates);
      
      // If there are duplicates, show the dialog
      if (duplicateCheck.totalDuplicates > 0) {
        setDuplicateDialog({
          open: true,
          duplicates: duplicateCheck.duplicates,
          duplicatesWithExisting: duplicateCheck.duplicatesWithExisting,
          uniqueTemplates: duplicateCheck.unique,
        });
        setUploading(false);
        e.target.value = '';
        return;
      }
      
      // No duplicates, add all
      await templatesService.bulkAdd(duplicateCheck.unique);
      await loadTemplates();
      setSuccess(`Uploaded ${duplicateCheck.unique.length} template${duplicateCheck.unique.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setError(err.message || 'Failed to upload templates');
    } finally {
      setUploading(false);
    }
    
    e.target.value = '';
  }

  // Handle confirmed add from duplicate dialog
  async function handleConfirmAddTemplates() {
    const { uniqueTemplates } = duplicateDialog;
    
    if (uniqueTemplates.length === 0) {
      setError('No unique templates to add');
      setDuplicateDialog({ ...duplicateDialog, open: false });
      return;
    }

    setSaving(true);
    try {
      await templatesService.bulkAdd(uniqueTemplates);
      await loadTemplates();
      setSuccess(`Added ${uniqueTemplates.length} template${uniqueTemplates.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setDuplicateDialog({ ...duplicateDialog, open: false });
    }
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const subjectIdx = headers.indexOf('subject');
    const bodyIdx = headers.indexOf('body');

    if (subjectIdx === -1 || bodyIdx === -1) {
      throw new Error('CSV must have "subject" and "body" columns. Optional: "name" column.');
    }

    // Parse rows
    const templates = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields (CSV with commas in content)
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim());

      const template = {
        subject: fields[subjectIdx]?.replace(/^"/, '').replace(/"$/, '') || '',
        body: fields[bodyIdx]?.replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n') || '',
      };

      if (nameIdx !== -1 && fields[nameIdx]) {
        template.name = fields[nameIdx].replace(/^"/, '').replace(/"$/, '');
      }

      if (template.subject && template.body) {
        templates.push(template);
      }
    }

    return templates;
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  // AI Template Generation
  async function handleAIGenerate() {
    setAiGenerating(true);
    setError('');
    
    try {
      const response = await aiAPI.generateTemplate({
        purpose: aiForm.purpose === 'custom' ? aiForm.customPurpose : aiForm.purpose,
        industry: aiForm.industry,
        tone: aiForm.tone,
        audience: aiForm.audience,
        keyPoints: aiForm.keyPoints.filter(k => k.trim()),
        availableFields: aiForm.availableFields,
        userId: user?.id,
      });
      
      if (response.success && response.template) {
        setAiPreview(response.template);
      } else {
        throw new Error(response.error || 'Failed to generate template');
      }
    } catch (err) {
      setError(err.message || 'AI generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSaveAITemplate() {
    if (!aiPreview) return;
    
    setSaving(true);
    try {
      await templatesService.add({
        name: aiPreview.name || `AI: ${aiForm.purpose}`,
        subject: aiPreview.subject,
        body: aiPreview.body,
      });
      await loadTemplates();
      setSuccess('AI template saved successfully!');
      setIsAIModalOpen(false);
      setAiPreview(null);
      setAiForm({
        purpose: 'sales_outreach',
        customPurpose: '',
        industry: '',
        tone: 'professional',
        audience: '',
        keyPoints: [''],
        availableFields: ['email'],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addKeyPoint() {
    if (aiForm.keyPoints.length < 5) {
      setAiForm({ ...aiForm, keyPoints: [...aiForm.keyPoints, ''] });
    }
  }

  function updateKeyPoint(index, value) {
    const newKeyPoints = [...aiForm.keyPoints];
    newKeyPoints[index] = value;
    setAiForm({ ...aiForm, keyPoints: newKeyPoints });
  }

  function removeKeyPoint(index) {
    if (aiForm.keyPoints.length > 1) {
      setAiForm({ 
        ...aiForm, 
        keyPoints: aiForm.keyPoints.filter((_, i) => i !== index) 
      });
    }
  }

  if (loading && templates.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Email Templates</h2>
          <p className="text-stone-500 mt-1">Create and manage your email templates</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".csv,.json" 
            onChange={handleFileUpload} 
            className="hidden"
            aria-label="Import templates CSV or JSON file"
          />
          {templates.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteAllConfirm(true)} loading={deletingAll}>
              <Trash2 className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Delete All</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleImportClick} loading={uploading}>
            <Upload className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Import'}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsAIModalOpen(true)}>
            <Sparkles className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Generate with AI</span>
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Add Template</span>
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="animate-fade-in" />}
      {success && <Alert type="success" message={success} className="animate-fade-in" />}

      {/* Format Help Card - Collapsible on mobile */}
      <Card>
        <details className="group">
          <summary className="flex items-center gap-3 cursor-pointer list-none">
            <div className="bg-stone-100 rounded-lg p-2">
              <Upload className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">Easy Template Import</h3>
              <p className="text-sm text-stone-500">CSV or JSON format supported</p>
            </div>
            <div className="text-stone-400 group-open:rotate-180 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="text-sm text-stone-600 space-y-3">
              <p><strong>Required columns:</strong> subject, body</p>
              <p><strong>Optional column:</strong> name (for your reference)</p>
              <div className="bg-stone-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <div className="text-stone-500">name,subject,body</div>
                <div>Welcome,Welcome!,"Hi!\n\nWelcome.\n\nBest"</div>
              </div>
              <p className="text-xs text-stone-500">💡 Use <code className="bg-stone-100 px-1 rounded">\n</code> for line breaks</p>
            </div>
          </div>
        </details>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Plus className="w-8 h-8 text-stone-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No templates yet</h3>
            <p className="text-stone-500 max-w-sm mx-auto mb-6">Create your first email template to start sending personalized campaigns</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={openAddModal}>
                Create Template
              </Button>
              <Button variant="outline" onClick={handleImportClick}>
                Import from File
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4" role="list" aria-label="Email templates">
            {paginatedTemplates.map((template, index) => {
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
              return (
                <Card key={template.id} role="listitem">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-stone-400">#{globalIndex}</span>
                        {template.name && (
                          <span className="text-xs font-medium text-stone-500">{template.name}</span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-stone-900 break-words">
                        {template.subject}
                      </h3>
                      <p className="text-stone-500 text-sm line-clamp-2 mt-1">
                        {template.body.substring(0, 200)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 sm:ml-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <button
                        onClick={() => setPreviewTemplate(template)}
                        className="flex-1 sm:flex-none p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        aria-label={`Preview template: ${template.subject}`}
                      >
                        <Eye className="w-5 h-5 mx-auto" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => openEditModal(template)}
                        className="flex-1 sm:flex-none p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        aria-label={`Edit template: ${template.subject}`}
                      >
                        <Edit className="w-5 h-5 mx-auto" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, id: template.id })}
                        disabled={deleting === template.id}
                        className="flex-1 sm:flex-none p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={`Delete template: ${template.subject}`}
                      >
                        <Trash2 className="w-5 h-5 mx-auto" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-stone-500 order-2 sm:order-1">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, templates.length)} of {templates.length} templates
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-stone-600 px-3 min-w-16 text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? 'Edit Template' : 'Add Template'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g., Welcome Email"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={100}
          />
          <Input
            label="Subject"
            placeholder="Enter email subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            maxLength={200}
          />
          <TextArea
            label="Body"
            placeholder="Enter email body (HTML supported)"
            rows={10}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editId ? 'Update' : 'Add'} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal - XSS Safe */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title="Template Preview"
        size="lg"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-1">Subject</label>
              <p className="text-lg font-medium text-stone-900">{previewTemplate.subject}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-1">Body</label>
              <div 
                className="bg-stone-50 rounded-lg p-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeAndFormat(previewTemplate.body)
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete All Confirmation */}
      <ConfirmDialog
        isOpen={deleteAllConfirm}
        onClose={() => setDeleteAllConfirm(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Templates"
        message={`Are you sure you want to delete all ${templates.length} templates? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
      />

      {/* AI Generation Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => {
          setIsAIModalOpen(false);
          setAiPreview(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Generate with AI
          </div>
        }
        size="lg"
      >
        <div className="space-y-5">
          {!aiPreview ? (
            <>
              {/* AI Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Email Purpose *
                  </label>
                  <select
                    value={aiForm.purpose}
                    onChange={(e) => setAiForm({ ...aiForm, purpose: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="sales_outreach">Sales Outreach</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="product_launch">Product Launch</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="partnership">Partnership Request</option>
                    <option value="event_invitation">Event Invitation</option>
                    <option value="re_engagement">Re-engagement</option>
                    <option value="feedback_request">Feedback Request</option>
                    <option value="custom">✨ Custom Purpose</option>
                  </select>
                  {aiForm.purpose === 'custom' && (
                    <input
                      type="text"
                      value={aiForm.customPurpose}
                      onChange={(e) => setAiForm({ ...aiForm, customPurpose: e.target.value })}
                      placeholder="Describe your email purpose..."
                      className="w-full mt-2 px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Tone *
                  </label>
                  <select
                    value={aiForm.tone}
                    onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="persuasive">Persuasive</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Industry (optional)
                  </label>
                  <input
                    type="text"
                    value={aiForm.industry}
                    onChange={(e) => setAiForm({ ...aiForm, industry: e.target.value })}
                    placeholder="e.g., SaaS, E-commerce, Finance"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Target Audience (optional)
                  </label>
                  <input
                    type="text"
                    value={aiForm.audience}
                    onChange={(e) => setAiForm({ ...aiForm, audience: e.target.value })}
                    placeholder="e.g., CTOs, Marketing Managers"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Available Contact Fields */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  What contact data do you have? *
                </label>
                <p className="text-xs text-stone-500 mb-3">
                  Select the fields available in your contacts. AI will only use these variables.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PERSONALIZATION_FIELDS.map((field) => {
                    const isSelected = aiForm.availableFields.includes(field.id);
                    const isDisabled = field.always;
                    return (
                      <button
                        key={field.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setAiForm({
                            ...aiForm,
                            availableFields: isSelected
                              ? aiForm.availableFields.filter(f => f !== field.id)
                              : [...aiForm.availableFields, field.id]
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {field.label}
                        {isSelected && !isDisabled && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-stone-700">
                    Key Points to Include (optional)
                  </label>
                  {aiForm.keyPoints.length < 5 && (
                    <button
                      type="button"
                      onClick={addKeyPoint}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + Add Point
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {aiForm.keyPoints.map((point, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={point}
                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                        placeholder={`Key point ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                      {aiForm.keyPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKeyPoint(index)}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-sm text-purple-700">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  AI will use these variables: {aiForm.availableFields.map(f => `{{${f}}}`).join(', ')}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsAIModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAIGenerate} 
                  loading={aiGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Template
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* AI Preview */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ Template generated! Review and save it below.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={aiPreview.subject}
                    onChange={(e) => setAiPreview({ ...aiPreview, subject: e.target.value })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Email Body
                  </label>
                  <textarea
                    value={aiPreview.body}
                    onChange={(e) => setAiPreview({ ...aiPreview, body: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setAiPreview(null)}
                >
                  ← Generate Another
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setIsAIModalOpen(false);
                      setAiPreview(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveAITemplate} 
                    loading={saving}
                  >
                    Save Template
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Duplicate Detection Dialog */}
      <DuplicateDialog
        isOpen={duplicateDialog.open}
        onClose={() => setDuplicateDialog({ ...duplicateDialog, open: false })}
        onConfirm={handleConfirmAddTemplates}
        type="templates"
        duplicates={duplicateDialog.duplicates}
        duplicatesWithExisting={duplicateDialog.duplicatesWithExisting}
        uniqueCount={duplicateDialog.uniqueTemplates.length}
        invalidItems={[]}
      />
    </div>
  );
}
