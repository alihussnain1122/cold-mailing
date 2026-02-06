import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Trash2, Upload, Search, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User, Building } from 'lucide-react';
import { Card, Button, Input, Modal, Alert, ConfirmDialog, PageLoader } from '../components/UI';
import { contactsService } from '../services/supabase';
import { useDebounce, parseContactsCSV } from '../utils';

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
      
      // Use personalization-aware CSV parser
      const { contacts: parsedContacts, fields } = parseContactsCSV(text);
      
      if (parsedContacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }

      await contactsService.bulkAdd(parsedContacts);
      await loadContacts();
      
      // Show which personalization fields were detected
      const personalizationFields = fields.filter(f => f !== 'email');
      let successMessage = `Uploaded ${parsedContacts.length} contacts`;
      if (personalizationFields.length > 0) {
        successMessage += ` with personalization fields: ${personalizationFields.join(', ')}`;
      }
      setSuccess(successMessage);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Contacts</h2>
          <p className="text-stone-500 mt-1">{contacts.length} email addresses</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".csv" 
            onChange={handleFileUpload} 
            className="hidden"
            aria-label="Import contacts CSV file"
          />
          {contacts.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteAllConfirm(true)} loading={deletingAll}>
              <Trash2 className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Delete All</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleImportClick} loading={uploading}>
            <Upload className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Import CSV'}</span>
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Add Contacts</span>
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Card>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            aria-label="Search contacts by email"
          />
        </div>

        {paginatedContacts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Users className="w-8 h-8 text-stone-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              {contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}
            </h3>
            <p className="text-stone-500 max-w-sm mx-auto mb-6">
              {contacts.length === 0 
                ? 'Import your email list or add contacts manually to start your campaign' 
                : 'Try a different search term'}
            </p>
            {contacts.length === 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleImportClick}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
                <Button variant="outline" onClick={() => setIsModalOpen(true)}>Add Manually</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {paginatedContacts.map((contact, index) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                const displayName = contact.firstName 
                  ? `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}`
                  : contact.name || null;
                return (
                  <div key={contact.id} className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-stone-400">#{globalIndex}</span>
                          {displayName && (
                            <span className="text-sm font-medium text-stone-900 truncate">{displayName}</span>
                          )}
                        </div>
                        <p className="text-sm text-stone-700 truncate">{contact.email}</p>
                        {contact.company && (
                          <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                            <Building className="w-3 h-3" />
                            {contact.company}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, id: contact.id, email: contact.email })}
                        disabled={deleting === contact.id}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={`Delete contact: ${contact.email}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-stone-500">#</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-stone-500">Email Address</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-stone-500">Name</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-stone-500">Company</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-stone-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((contact, index) => {
                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const displayName = contact.firstName 
                      ? `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}`
                      : contact.name || '-';
                    return (
                      <tr key={contact.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-stone-400">{globalIndex}</td>
                        <td className="py-3 px-4 text-sm text-stone-900 font-medium">{contact.email}</td>
                        <td className="py-3 px-4 text-sm text-stone-600">
                          <div className="flex items-center gap-1.5">
                            {displayName !== '-' && <User className="w-3.5 h-3.5 text-stone-400" />}
                            <span>{displayName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-stone-600">
                          <div className="flex items-center gap-1.5">
                            {contact.company && <Building className="w-3.5 h-3.5 text-stone-400" />}
                            <span>{contact.company || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteConfirm({ open: true, id: contact.id, email: contact.email })}
                            disabled={deleting === contact.id}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-stone-100">
                <p className="text-sm text-stone-500 order-2 sm:order-1">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length}
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="text-sm text-stone-600 px-3 min-w-16 text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" aria-hidden="true" />
                  </button>
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
            <label htmlFor="emails-input" className="block text-sm font-medium text-stone-700 mb-1.5">
              Email Addresses
            </label>
            <textarea
              id="emails-input"
              rows={8}
              placeholder="Enter email addresses (one per line, or separated by commas)"
              value={newEmails}
              onChange={(e) => setNewEmails(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent resize-none"
            />
            <p className="mt-1.5 text-xs text-stone-500">
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
