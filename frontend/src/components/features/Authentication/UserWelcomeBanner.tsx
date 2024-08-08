import { LanguageComboBox } from "@/components/ui/LanguageComboBox";
import { Session } from "@supabase/gotrue-js/src/lib/types";
import { toast } from "sonner";
import { UserInfoDropdown } from "./UserInfoDropdown";

interface UserWelcomeBannerProps {
	session: Session;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	supabase: any;
}

export function UserWelcomeBanner({
	session,
	supabase,
}: UserWelcomeBannerProps) {
	return (
		<>
			<div className="flex justify-between items-center gap-2 m-3">
				<div className="flex items-center">
					<h1 className="italic">Welcome, </h1>
					<h1 className="bold ml-1">
						{session.user.email === "" ? "Demo User " : session.user.email}
					</h1>
					<UserInfoDropdown />
					<div>
						<button
							className="btn btn-link"
							onClick={async () => {
								await supabase.auth.signOut();
								toast.success("Signed out successfully!");
							}}
						>
							Sign out
						</button>
					</div>
				</div>
			</div>
			<div className="max-w-xs ml-5 m-3">
				<LanguageComboBox />
			</div>
		</>
	);
}
