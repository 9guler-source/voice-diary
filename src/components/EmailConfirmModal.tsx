"use client";

type Props = {
  email: string;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function EmailConfirmModal({
  email,
  title = "이메일을 확인해주세요",
  message,
  confirmLabel = "맞습니다",
  cancelLabel = "수정하겠습니다",
  onConfirm,
  onCancel,
}: Props) {
  return (
    // 반투명 오버레이
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6"
      onClick={(e) => {
        // 배경 클릭 시 닫기
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-base font-bold text-stone-800">{title}</h2>

        {message && (
          <p className="mb-3 text-sm text-stone-500">{message}</p>
        )}

        {/* 이메일 표시 박스 */}
        <div className="my-4 rounded-xl bg-brand-50 border border-brand-200 px-4 py-4 text-center">
          <p className="break-all text-base font-bold text-brand-700">{email}</p>
        </div>

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
