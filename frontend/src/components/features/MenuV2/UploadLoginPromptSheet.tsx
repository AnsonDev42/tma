import { useSession } from "@/contexts/SessionContext";
import supabase from "@/lib/supabaseClient";
import { Turnstile } from "@marsidev/react-turnstile";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "sonner";

interface UploadLoginPromptSheetProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	theme: string;
}

const UploadLoginPromptSheet: React.FC<UploadLoginPromptSheetProps> = ({
	isOpen,
	onClose,
	onSuccess,
	theme,
}) => {
	const { setSession } = useSession();
	const [captchaToken, setCaptchaToken] = useState("");
	const [isSigningIn, setIsSigningIn] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			setCaptchaToken("");
			setIsSigningIn(false);
		}
	}, [isOpen]);

	const handleAnonymousSignIn = async () => {
		if (!captchaToken) {
			toast.error("Complete the verification first.");
			return;
		}

		setIsSigningIn(true);
		try {
			const {
				data: { session },
				error,
			} = await supabase.auth.signInAnonymously({
				options: { captchaToken },
			});

			if (error) {
				throw error;
			}

			setSession(session);
			toast.success("Signed in anonymously.");
			onSuccess();
		} catch (error) {
			toast.error((error as Error).message || "Anonymous sign-in failed.");
		} finally {
			setIsSigningIn(false);
		}
	};

	if (typeof document === "undefined") {
		return null;
	}

	return ReactDOM.createPortal(
		<div
			className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
				isOpen ? "opacity-100" : "pointer-events-none opacity-0"
			}`}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute inset-0 bg-slate-950/45"
				aria-label="Close login prompt"
			/>
			<div
				className={`absolute bottom-0 left-0 right-0 rounded-t-3xl border p-5 shadow-2xl transition-transform duration-300 ${
					isOpen ? "translate-y-0" : "translate-y-full"
				} ${
					theme === "dark"
						? "border-slate-700 bg-slate-900 text-slate-100"
						: "border-slate-300 bg-slate-100 text-slate-800"
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
				<h3 className="mt-1 text-xl font-semibold">Anonymous sign-in</h3>
				<p className="mt-2 text-sm text-slate-500">
					Sign in once, then upload menus directly from this screen.
				</p>

				<div className="mt-4 rounded-xl border border-slate-300/70 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
					<Turnstile
						siteKey="0x4AAAAAAAaDaYB6f6UNZHsB"
						onSuccess={(token) => {
							setCaptchaToken(token);
						}}
					/>
				</div>

				<div className="mt-4 flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className={`rounded-lg px-3 py-2 text-sm font-medium ${
							theme === "dark"
								? "bg-slate-800 text-slate-200 hover:bg-slate-700"
								: "bg-slate-200 text-slate-700 hover:bg-slate-300"
						}`}
						disabled={isSigningIn}
					>
						Later
					</button>
					<button
						type="button"
						onClick={() => {
							void handleAnonymousSignIn();
						}}
						disabled={isSigningIn}
						className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSigningIn ? "Signing in..." : "Sign in anonymously"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default UploadLoginPromptSheet;
