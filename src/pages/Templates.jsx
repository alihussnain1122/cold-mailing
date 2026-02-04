import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Upload, Eye } from 'lucide-react';
import { Card, Button, Input, TextArea, Modal, Alert, ConfirmDialog, PageLoader } from '../components/UI';
import { templatesService } from '../services/supabase';
import { sanitizeAndFormat } from '../utils';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });
  
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef(null);

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
      
      await templatesService.bulkAdd(templatesArray);
      await loadTemplates();
      setSuccess(`Uploaded ${templatesArray.length} template${templatesArray.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setError(err.message || 'Failed to upload templates');
    } finally {
      setUploading(false);
    }
    
    e.target.value = '';
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

  if (loading && templates.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Email Templates</h2>
          <p className="text-stone-500 mt-1">Create and manage your email templates</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".csv,.json" 
            onChange={handleFileUpload} 
            className="hidden"
            aria-label="Import templates CSV or JSON file"
          />
          {templates.length > 0 && (
            <Button variant="danger" onClick={() => setDeleteAllConfirm(true)} loading={deletingAll}>
              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Delete All
            </Button>
          )}
          <Button variant="outline" onClick={handleImportClick} loading={uploading}>
            <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
            {uploading ? 'Uploading...' : 'Import CSV/JSON'}
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Template
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="animate-fade-in" />}
      {success && <Alert type="success" message={success} className="animate-fade-in" />}

      {/* Format Help Card */}
      <Card>
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-stone-200 rounded-full p-2 mt-0.5">
              <Upload className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900 mb-1">Easy Template Import</h3>
              <p className="text-sm text-stone-700 mb-2">
                Upload templates using <strong>CSV</strong> (Excel/Sheets) or JSON format
              </p>
              <details className="text-sm text-stone-600">
                <summary className="cursor-pointer hover:text-stone-900 font-medium mb-2">
                  📋 Click to see CSV format example
                </summary>
                <div className="mt-2 pl-4 border-l-2 border-stone-200 space-y-2">
                  <p><strong>Required columns:</strong> subject, body</p>
                  <p><strong>Optional column:</strong> name (for your reference)</p>
                  <div className="bg-white rounded p-2 font-mono text-xs overflow-x-auto">
                    <div>name,subject,body</div>
                    <div>Welcome,Welcome to Our Service!,"Hi!\n\nWelcome to our platform.\n\nBest regards"</div>
                  </div>
                  <p className="text-xs">💡 Use <code className="bg-stone-100 px-1 rounded">\n</code> for line breaks</p>
                  <p className="text-xs">💡 Open CSV in Excel or Google Sheets to edit easily</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-stone-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">No templates yet</h3>
            <p className="text-stone-500 mb-4">Create your first email template to get started</p>
            <Button onClick={openAddModal}>Create Template</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Email templates">
          {templates.map((template) => (
            <Card key={template.id} role="listitem">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-stone-400">{template.name || 'Untitled'}</span>
                    <h3 className="text-lg font-semibold text-stone-900 truncate">
                      {template.subject}
                    </h3>
                  </div>
                  <p className="text-stone-500 text-sm line-clamp-2">
                    {template.body.substring(0, 200)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label={`Preview template: ${template.subject}`}
                  >
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label={`Edit template: ${template.subject}`}
                  >
                    <Edit className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ open: true, id: template.id })}
                    disabled={deleting === template.id}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Delete template: ${template.subject}`}
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
    </div>
  );
}
