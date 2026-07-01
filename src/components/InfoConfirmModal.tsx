"use client";

export type InfoItem = {
  label: string;
  value: string;
  sensitive?: boolean; // true이면 **** 마스킹
};

type Props = {
  title: string;
  message?: string;
  items: InfoItem[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function InfoConfirmModal({
  title,
  message,
  items,
  confirmLabel = "맞습니다",
  cancelLabel = "수정하겠습니다",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-base font-bold text-stone-800 mb-1">{title}</h2>
        {message && <p className="text-sm text-stone-500 mb-3">{message}</p>}

        {/* 입력 정보 요약 카드 */}
        <div className="my-4 rounded-xl bg-stone-50 border border-stone-200 divide-y divide-stone-100">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-stone-400 shrink-0 mr-3">{item.label}</span>
              <span className={`text-sm font-semibold break-all text-right ${item.sensitive ? "tracking-widest" : "text-stone-800"}`}>
                {item.sensitive ? "●".repeat(item.value.length) : item.value}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-400 text-center mb-4">
          위 정보가 모두 정확한지 확인해주세요.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700 active:bg-stone-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white active:bg-brand-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
