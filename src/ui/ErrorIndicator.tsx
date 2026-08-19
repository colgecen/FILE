import { useErrorStore } from '../core/errorStore';

export function ErrorIndicator(): React.JSX.Element {
  const records = useErrorStore();
  if (records.length === 0) return <></>;
  const latest = records[0];
  return (
    <div
      className="error-indicator"
      role="status"
      aria-label={`${records.length} hata`}
      title={latest?.message}
    >
      <span className="error-indicator__dot" />
      <span className="error-indicator__count">{records.length}</span>
    </div>
  );
}