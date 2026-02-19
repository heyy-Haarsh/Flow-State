import { Shield, Download, Trash2, Database, Eye, Lock, Clock } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { useSettingsStore } from '@/stores/settings-store';
import { RETENTION_OPTIONS } from '@/utils/constants';
import { useState } from 'react';

export default function PrivacyDashboard() {
    const settings = useSettingsStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleExport = () => {
        if (window.electron?.exportData) {
            window.electron.exportData('json');
        } else {
            alert('Export available in desktop app');
        }
    };

    const handleDelete = () => {
        if (window.electron?.deleteAllData) {
            window.electron.deleteAllData();
        }
        setShowDeleteConfirm(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-dark-100">Privacy Dashboard</h2>
                <p className="text-sm text-dark-400 mt-1">Your data stays on your device. Always.</p>
            </div>

            {/* Privacy Principles */}
            <Card>
                <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-green-400" />
                    Privacy Principles
                </h3>
                <div className="space-y-3">
                    {[
                        { icon: Lock, color: '#10B981', title: 'Local-Only Storage', desc: 'All data stored in local SQLite database — nothing goes to the cloud' },
                        { icon: Eye, color: '#3B82F6', title: 'No Content Tracking', desc: 'We track typing speed patterns, NOT what you type' },
                        { icon: Database, color: '#8B5CF6', title: 'You Own Your Data', desc: 'Export or delete all your data at any time' },
                        { icon: Clock, color: '#F59E0B', title: 'Auto-Cleanup', desc: `Data older than ${settings.dataRetentionDays} days is automatically deleted` },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-dark-900/40">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: item.color + '15' }}>
                                    <Icon size={14} style={{ color: item.color }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-dark-200">{item.title}</p>
                                    <p className="text-xs text-dark-500">{item.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Data Retention */}
            <Card>
                <h3 className="font-semibold text-dark-100 mb-4">Data Retention Period</h3>
                <div className="grid grid-cols-2 gap-2">
                    {RETENTION_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => settings.updateSetting('dataRetentionDays', opt.value)}
                            className={`p-3 rounded-xl border text-sm text-left transition-all ${settings.dataRetentionDays === opt.value
                                    ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                                    : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Actions */}
            <Card>
                <h3 className="font-semibold text-dark-100 mb-4">Data Actions</h3>
                <div className="space-y-3">
                    <Button variant="secondary" className="w-full" onClick={handleExport} icon={<Download size={16} />}>
                        Export All Data (JSON)
                    </Button>

                    {showDeleteConfirm ? (
                        <div className="p-4 rounded-xl border border-red-500/30 bg-red-600/5">
                            <p className="text-sm text-red-400 mb-3">⚠️ This will permanently delete ALL your data. This cannot be undone.</p>
                            <div className="flex gap-2">
                                <Button variant="danger" className="flex-1" onClick={handleDelete} icon={<Trash2 size={14} />}>
                                    Yes, Delete Everything
                                </Button>
                                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="danger" className="w-full" onClick={() => setShowDeleteConfirm(true)} icon={<Trash2 size={16} />}>
                            Delete All Data
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
