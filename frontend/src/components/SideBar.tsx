import History from "@/components/HistoryList.tsx";
import { DishProps } from "@/types/DishProps.tsx";

type SidebarProps = {
	onSelectUpload: (imageSrc: string, data: DishProps[]) => void;
};

const Sidebar: React.FC<SidebarProps> = ({ onSelectUpload }) => {
	return (
		/*  sidebar is a menu component */
		<ul className="menu max-h-full max-w-3/4  bg-main-content  rounded-box mt-20 ">
			{/* currently sidebar has tabs including: history...  */}
			<div role="tablist" className="tabs tabs-boxed tabs-lg">
				<input
					type="radio"
					name="my_tabs_2"
					role="tab"
					className="tab "
					aria-label="History"
					checked
				/>
				<div
					role="tabpanel"
					className="tab-content bg-base-100 border-base-300 rounded-box p-6"
				>
					<History onSelectUpload={onSelectUpload} />
				</div>

				<input
					type="radio"
					name="my_tabs_2"
					role="tab"
					className="tab"
					aria-label="Tab 2"
				/>
				<div
					role="tabpanel"
					className="tab-content bg-base-100 border-base-300 rounded-box p-6"
				>
					Tab content 2
				</div>
			</div>
		</ul>
	);
};

export default Sidebar;
