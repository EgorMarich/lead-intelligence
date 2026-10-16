import styles from './StatusBadge.module.scss';

const labels: Record<string, string> = {
  PENDING: 'Ожидает',
  RUNNING: 'Выполняется',
  COMPLETED: 'Завершён',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменён',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${styles.badge} ${styles[status] ?? ''}`}>
      <i />
      {labels[status] ?? status}
    </span>
  );
}
