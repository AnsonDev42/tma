import { LanguageComboBox } from "@/components/ui/LanguageComboBox";
import { Session } from "@supabase/gotrue-js/src/lib/types";
import { UserInfoDropdown } from "./UserInfoDropdown";

interface UserWelcomeBannerProps {
	session: Session;
}

export function UserWelcomeBanner({ session }: UserWelcomeBannerProps) {
	return (
		<>
			<div className="flex justify-between items-center gap-2 m-3">
				<div className="flex items-center">
					<h1 className="italic">Welcome, </h1>
					<h1 className="bold ml-1">
						{session.user.email === "" ? "Demo User " : session.user.email}
					</h1>
					<UserInfoDropdown />
				</div>
			</div>
			<div className="max-w-xs ml-5 m-3">
				<LanguageComboBox />
			</div>
		</>
	);
}
