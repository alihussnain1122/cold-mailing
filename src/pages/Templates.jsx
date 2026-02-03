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
      const imported = JSON.parse(text);
      const templatesArray = Array.isArray(imported) ? imported : [imported];
      
      await templatesService.bulkAdd(templatesArray);
      await loadTemplates();
      setSuccess(`Uploaded ${templatesArray.length} templates`);
    } catch (err) {
      setError(err.message || 'Failed to upload templates');
    } finally {
      setUploading(false);
    }
    
    e.target.value = '';
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
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-gray-500 mt-1">Create and manage your email templates</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".json" 
            onChange={handleFileUpload} 
            className="hidden"
            aria-label="Import templates JSON file"
          />
          {templates.length > 0 && (
            <Button variant="danger" onClick={() => setDeleteAllConfirm(true)} loading={deletingAll}>
              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Delete All
            </Button>
          )}
          <Button variant="outline" onClick={handleImportClick} loading={uploading}>
            <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
            {uploading ? 'Uploading...' : 'Import JSON'}
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Template
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="animate-fade-in" />}
      {success && <Alert type="success" message={success} className="animate-fade-in" />}

      {templates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first email template to get started</p>
            <Button onClick={openAddModal}>Create Template</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Email templates">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow" role="listitem">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-400">{template.name || 'Untitled'}</span>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {template.subject}
                    </h3>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {template.body.substring(0, 200)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={`Preview template: ${template.subject}`}
                  >
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={`Edit template: ${template.subject}`}
                  >
                    <Edit className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ open: true, id: template.id })}
                    disabled={deleting === template.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
              <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
              <p className="text-lg font-medium text-gray-900">{previewTemplate.subject}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Body</label>
              <div 
                className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none"
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
