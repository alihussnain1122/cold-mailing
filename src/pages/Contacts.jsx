import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Upload, Search, Users } from 'lucide-react';
import { Card, Button, Input, Modal, Alert } from '../components/UI';
import { contactsAPI } from '../services/api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmails, setNewEmails] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  async function loadContacts() {
    try {
      const data = await contactsAPI.getAll();
      setContacts(data);
    } catch (err) {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEmails() {
    const emails = newEmails
      .split(/[\n,;]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      setError('Please enter valid email addresses');
      return;
    }

    try {
      const result = await contactsAPI.add(emails);
      setContacts(result.contacts);
      setSuccess(`Added ${result.added} new contacts`);
      setIsModalOpen(false);
      setNewEmails('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(email) {
    try {
      const result = await contactsAPI.delete(email);
      setContacts(result.contacts);
      setSuccess('Contact deleted');
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
      const result = await contactsAPI.upload(file);
      setContacts(result.contacts);
      setSuccess(`Uploaded ${result.count} contacts`);
    } catch (err) {
      setError(err.message || 'Failed to upload contacts');
    }
    
    e.target.value = '';
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  const filteredContacts = contacts.filter(c =>
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contacts
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Card>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
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
          <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email Address</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr key={contact.email} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{contact.email}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(contact.email)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Addresses
            </label>
            <textarea
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
            <Button onClick={handleAddEmails}>
              Add Contacts
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
