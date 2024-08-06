import { HelperDropDownIcon } from "@/components/ui/Icons/HelperDropDownIcon";
// a detailed view of the user's information
import { useSession } from "@/contexts/SessionContext";
import { UserInfo, useUserInfo } from "@/contexts/UserInfoContext";
import { Session } from "@supabase/gotrue-js/src/lib/types.ts";

export function UserInfoDropdown() {
	const user: UserInfo | null = useUserInfo()?.userInfo;
	const session: Session | null = useSession()?.session;
	const name =
		session?.user?.user_metadata?.full_name ||
		session?.user?.email ||
		"Anonymous User";

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={0}
				role="button"
				className="btn btn-circle btn-ghost btn-xs text-info"
			>
				<HelperDropDownIcon />
			</div>
			<div
				tabIndex={0}
				className="card compact dropdown-content bg-base-100 rounded-box z-[100] w-64 shadow"
			>
				<div className="card-body">
					<h2 className="card-titl">{name}</h2>
					<p>{session?.user?.email}</p>
					<p>You are a {user?.role} tier user</p>
					<hr className="divider" />

					{/* additional information in bold */}
					<p className="font-bold">Additional information</p>
					<p>
						*Free tier users can only use the app for 5 asks per day (you can
						logout and login as new anonymous user to reset the counter)
					</p>
					<p>Trial and paid users can use the app for 50 asks per day</p>
				</div>
			</div>
		</div>
	);
}
