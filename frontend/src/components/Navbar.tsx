import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import React from "react";
export function Navbar(): React.ReactElement {
	return (
		<div>
			<div className="w-full navbar bg-base-100">
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
				<div className="navbar-end mr-10 ">
					<ThemeToggle />
				</div>
			</div>
		</div>
	);
}
