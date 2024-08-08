import { LanguageComboBox } from "@/components/ui/LanguageComboBox";
import { UserInfoDropdown } from "./UserInfoDropdown";

export function UserWelcomeBanner() {
	return (
		<>
			<div className="flex justify-between items-center gap-2 m-3">
				<div className="flex items-center">
					<h1 className="italic">Welcome, </h1>
					<h1 className="bold ml-1">please enjoy your time on The Menu App!</h1>
					<UserInfoDropdown />
				</div>
			</div>
			<div className="max-w-xs ml-5 m-3">
				<LanguageComboBox />
			</div>
		</>
	);
}
