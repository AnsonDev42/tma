import React from "react";

interface UploadLoginPromptSheetProps {
	isOpen: boolean;
	onClose: () => void;
	onGoToLogin: () => void;
	theme: string;
	isFirstPrompt: boolean;
}

const UploadLoginPromptSheet: React.FC<UploadLoginPromptSheetProps> = ({
	isOpen,
	onClose,
	onGoToLogin,
	theme,
	isFirstPrompt,
}) => {
	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[90]">
			<button
				type="button"
				onClick={onClose}
				className="absolute inset-0 bg-slate-950/45"
				aria-label="Close login prompt"
			/>
			<div
				className={`absolute bottom-0 left-0 right-0 rounded-t-3xl border p-5 shadow-2xl transition-transform duration-300 ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-100"
						: "border-slate-200 bg-white text-slate-900"
				}`}
			>
				<div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-400/50" />
				<p
					className={`text-xs font-semibold uppercase tracking-[0.18em] ${
						theme === "dark" ? "text-teal-300" : "text-teal-700"
					}`}
				>
					Sign In Required
				</p>
				<h3 className="mt-1 text-xl font-semibold">
					{isFirstPrompt
						? "One quick login before upload"
						: "Login to upload menus"}
				</h3>
				<p className="mt-2 text-sm text-slate-500">
					Use the login page to verify session and then continue with menu
					upload.
				</p>
				<div className="mt-4 flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className={`rounded-lg px-3 py-2 text-sm font-medium ${
							theme === "dark"
								? "bg-slate-800 text-slate-200 hover:bg-slate-700"
								: "bg-slate-100 text-slate-700 hover:bg-slate-200"
						}`}
					>
						Later
					</button>
					<button
						type="button"
						onClick={onGoToLogin}
						className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
					>
						Go to login
					</button>
				</div>
			</div>
		</div>
	);
};

export default UploadLoginPromptSheet;
