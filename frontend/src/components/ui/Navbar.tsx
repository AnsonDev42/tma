import { ThemeToggle } from "@/components/ui/ThemeToggle.tsx";
import { useSession } from "@/contexts/SessionContext";
import { useUserInfo } from "@/contexts/UserInfoContext.tsx";
import supabase from "@/lib/supabaseClient";
import React from "react";
import { toast } from "sonner";

export function Navbar(): React.ReactElement {
	const session = useSession()?.session;
	const setSession = useSession()?.setSession;
	const handleSignOut = async () => {
		await supabase.auth.signOut();
		setSession(null); // Update the session context
		toast.success("Signed out successfully!");
	};
	const name =
		session?.user?.user_metadata?.full_name ||
		session?.user?.email ||
		"Anonymous User";

	const userRole = useUserInfo()?.userInfo?.role || "Free";
	return (
		<div>
			<div className="w-full navbar bg-base-300 text-base-content">
				<div className="flex-none lg:hidden">
					<label
						htmlFor="my-drawer-3"
						aria-label="open sidebar"
						className="btn btn-square btn-ghost"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							className="inline-block w-6 h-6 stroke-current"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M4 6h16M4 12h16M4 18h16"
							></path>
						</svg>
					</label>
				</div>
				<a className="btn btn-ghost text-xl">The Menu App</a>
				<div className="flex-none hidden lg:block"></div>
				{/* more navi bar content here */}
				<div className="navbar-end md-5">
					<ThemeToggle />
					<div className="dropdown dropdown-end">
						<div
							tabIndex={0}
							role="button"
							className="btn btn-ghost btn-circle avatar"
						>
							<div className="avatar placeholder">
								<div className="bg-neutral text-neutral-content w-12 rounded-full">
									<span>
										{session?.user.user_metadata?.full_name || "Demo User"}
									</span>
								</div>
							</div>
						</div>
						<ul
							tabIndex={0}
							className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
						>
							<li>
								<a className="justify-between">
									<span>{name}</span>
									<span className="badge">{userRole}</span>
								</a>
							</li>
							<li>
								<a>Settings</a>
							</li>
							<li>
								<a onClick={handleSignOut}>Sign out</a>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
