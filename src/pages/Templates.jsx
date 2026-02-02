import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Edit, Upload, Eye } from 'lucide-react';
import { Card, Button, Input, TextArea, Modal, Alert } from '../components/UI';
import { templatesAPI } from '../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({ subject: '', body: '' });
  
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await templatesAPI.getAll();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditIndex(null);
    setFormData({ subject: '', body: '' });
    setIsModalOpen(true);
  }

  function openEditModal(index) {
    setEditIndex(index);
    setFormData({ ...templates[index] });
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!formData.subject.trim() || !formData.body.trim()) {
      setError('Subject and body are required');
      return;
    }

    try {
      if (editIndex !== null) {
        const updatedTemplates = [...templates];
        updatedTemplates[editIndex] = formData;
        await templatesAPI.saveAll(updatedTemplates);
        setTemplates(updatedTemplates);
        setSuccess('Template updated successfully');
      } else {
        const result = await templatesAPI.add(formData);
        setTemplates(result.templates);
        setSuccess('Template added successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(index) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const result = await templatesAPI.delete(index);
      setTemplates(result.templates);
      setSuccess('Template deleted successfully');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');

    try {
      const result = await templatesAPI.upload(file);
      setTemplates(result.templates);
      setSuccess(`Uploaded ${result.count} templates`);
    } catch (err) {
      setError(err.message || 'Failed to upload templates');
    }
    
    e.target.value = '';
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
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
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
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
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first email template to get started</p>
            <Button onClick={openAddModal}>Create Template</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
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
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(index)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
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
        title={editIndex !== null ? 'Edit Template' : 'Add Template'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Subject"
            placeholder="Enter email subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
            <Button onClick={handleSave}>
              {editIndex !== null ? 'Update' : 'Add'} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
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
                  __html: previewTemplate.body.replace(/\n/g, '<br>') 
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
