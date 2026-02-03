import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Trash2, Upload, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Input, Modal, Alert, ConfirmDialog, PageLoader } from '../components/UI';
import { contactsService } from '../services/supabase';
import { useDebounce } from '../utils';

const ITEMS_PER_PAGE = 50;

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmails, setNewEmails] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, email: null });
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef(null);

  // Debounced search term
  const debouncedSearch = useDebounce(searchTerm, 300);

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

  const loadContacts = useCallback(async () => {
    try {
      const data = await contactsService.getAll();
      setContacts(data);
    } catch (err) {
      setError('Failed to load contacts: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Filtered and paginated contacts
  const { filteredContacts, paginatedContacts, totalPages } = useMemo(() => {
    const filtered = contacts.filter(c =>
      c.email.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    
    const total = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);
    
    return {
      filteredContacts: filtered,
      paginatedContacts: paginated,
      totalPages: total,
    };
  }, [contacts, debouncedSearch, currentPage]);

  async function handleAddEmails() {
    const emails = newEmails
      .split(/[\n,;]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      setError('Please enter valid email addresses');
      return;
    }

    setSaving(true);
    try {
      await contactsService.bulkAdd(emails);
      await loadContacts();
      setSuccess(`Added ${emails.length} contacts`);
      setIsModalOpen(false);
      setNewEmails('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await contactsService.delete(id);
      await loadContacts();
      setSuccess('Contact deleted');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
      setDeleteConfirm({ open: false, id: null, email: null });
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await contactsService.deleteAll();
      setContacts([]);
      setSuccess('All contacts deleted successfully');
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
      const lines = text.split(/[\n\r]+/).filter(line => line.trim());
      // Skip header if it looks like one
      const startIndex = lines[0]?.toLowerCase().includes('email') ? 1 : 0;
      const emails = lines.slice(startIndex)
        .map(line => line.split(',')[0].trim().replace(/"/g, ''))
        .filter(email => email && email.includes('@'));
      
      if (emails.length === 0) {
        throw new Error('No valid emails found in CSV');
      }

      await contactsService.bulkAdd(emails);
      await loadContacts();
      setSuccess(`Uploaded ${emails.length} contacts`);
    } catch (err) {
      setError(err.message || 'Failed to upload contacts');
    } finally {
      setUploading(false);
    }
    
    e.target.value = '';
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  if (loading && contacts.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="text-gray-500 mt-1">{contacts.length} email addresses</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".csv" 
            onChange={handleFileUpload} 
            className="hidden"
            aria-label="Import contacts CSV file"
          />
          {contacts.length > 0 && (
            <Button variant="danger" onClick={() => setDeleteAllConfirm(true)} loading={deletingAll}>
              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Delete All
            </Button>
          )}
          <Button variant="outline" onClick={handleImportClick} loading={uploading}>
            <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
            {uploading ? 'Uploading...' : 'Import CSV'}
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Contacts
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Card>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search contacts by email"
          />
        </div>

        {paginatedContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}
            </h3>
            <p className="text-gray-500 mb-4">
              {contacts.length === 0 
                ? 'Add your first contact to get started' 
                : 'Try a different search term'}
            </p>
            {contacts.length === 0 && (
              <Button onClick={() => setIsModalOpen(true)}>Add Contacts</Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email Address</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((contact, index) => {
                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-400">{globalIndex}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{contact.email}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteConfirm({ open: true, id: contact.id, email: contact.email })}
                            disabled={deleting === contact.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Delete contact: ${contact.email}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} contacts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Contacts Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Contacts"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="emails-input" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Addresses
            </label>
            <textarea
              id="emails-input"
              rows={8}
              placeholder="Enter email addresses (one per line, or separated by commas)"
              value={newEmails}
              onChange={(e) => setNewEmails(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Separate multiple emails with new lines, commas, or semicolons
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmails} loading={saving}>
              Add Contacts
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, email: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Delete Contact"
        message={`Are you sure you want to delete "${deleteConfirm.email}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete All Confirmation */}
      <ConfirmDialog
        isOpen={deleteAllConfirm}
        onClose={() => setDeleteAllConfirm(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Contacts"
        message={`Are you sure you want to delete all ${contacts.length} contacts? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
      />
    </div>
  );
}
