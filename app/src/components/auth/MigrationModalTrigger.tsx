import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasLocalData } from '../../store/cloudStore';
import { MigrationModal } from './MigrationModal';

const SESSION_KEY = 'assisy_migration_offered';

export function MigrationModalTrigger() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (!hasLocalData()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setShowModal(true);
    sessionStorage.setItem(SESSION_KEY, '1');
  }, [user?.id]);

  const handleClose = () => setShowModal(false);
  const handleMigrated = () => { /* reload happens in MigrationModal */ };

  return (
    <MigrationModal
      isOpen={showModal}
      onClose={handleClose}
      userId={user?.id ?? ''}
      onMigrated={handleMigrated}
    />
  );
}
