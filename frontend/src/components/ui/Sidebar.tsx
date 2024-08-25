import CartView from "@/components/features/Cart/CartView.tsx";
import History from "@/components/features/History/HistoryList.tsx";
import { SidebarProps } from "@/components/types/SidebarProps";
import React from "react";

function Sidebar({ onSelectUpload }: SidebarProps): React.ReactElement {
	return (
		/*  sidebar is a menu component */
		<ul className="menu max-h-full max-w-3/4 bg-main-content rounded-box mt-20 overflow-hidden overflow-y-auto">
			{/* currently sidebar has tabs including: history...  */}
			<div role="tablist" className="tabs tabs-boxed tabs-lg">
				<input
					type="radio"
					name="my_tabs_2"
					role="tab"
					className="tab "
					aria-label="History"
					checked
					onChange={() => {}}
				/>
				<div
					role="tabpanel"
					className="tab-content bg-base-100 border-base-300 rounded-box p-6 lg:max-w-screen-md"
				>
					<History onSelectUpload={onSelectUpload} />
				</div>

				<input
					type="radio"
					name="my_tabs_2"
					role="tab"
					className="tab"
					aria-label="Cart"
				/>
				<div
					role="tabpanel"
					className="tab-content bg-base-100 border-base-300 rounded-box p-6"
				>
					<CartView />
				</div>
			</div>
		</ul>
	);
}

export default Sidebar;
