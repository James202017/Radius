interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-white/40 text-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 rounded-2xl bg-brand-500 text-white text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
