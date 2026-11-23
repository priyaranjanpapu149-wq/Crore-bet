interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-brand-card border border-brand-border rounded-lg w-full ${width} max-h-[90vh] overflow-y-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-brand-card z-10">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}