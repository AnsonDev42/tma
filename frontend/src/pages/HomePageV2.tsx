import { useNavigate } from "react-router-dom";

export default function HomePageV2() {
	const navigate = useNavigate();

	const goToV1 = () => {
		navigate("/home");
	};

	return (
		<div>
			<header>
				<h1>V2 Interface</h1>
				<button
					onClick={goToV1}
					className="version-toggle"
					style={{
						position: "fixed",
						top: "10px",
						right: "10px",
						zIndex: 1000,
						padding: "5px 10px",
						background: "#4a4a4a",
						color: "white",
						borderRadius: "4px",
						cursor: "pointer",
					}}
				>
					Back to V1
				</button>
			</header>

			<main className="v2-content">
				{/* Your V2 UI content */}
				hello v2
			</main>
		</div>
	);
}
