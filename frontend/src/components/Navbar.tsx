import {LanguageComboBox} from "@/components/LanguageComboBox";
import React from "react";
import {ThemeToggle} from "@/components/ThemeToggle.tsx";

export function Navbar(): React.ReactElement {
	return (
		<div>
			<div className="navbar bg-base-100">
				<div className="navbar-start">
					<div className="dropdown">
						<div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M4 6h16M4 12h8m-8 6h16"
								/>
							</svg>
						</div>
						<ul
							tabIndex={0}
							className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
						>
							<LanguageComboBox />
						</ul>
					</div>
					<a className="btn btn-ghost text-xl">The Menu App</a>
				</div>
				<div className="navbar-center hidden lg:flex">
					<ul className="menu menu-horizontal px-1">
						<li>
							<a>
								<LanguageComboBox />
							</a>
						</li>
					</ul>
				</div>
				<div className="navbar-end">
					<ThemeToggle />
				</div>
			</div>
		</div>
	);
}
