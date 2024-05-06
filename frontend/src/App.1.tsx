export function App() {
	return (
		<div className="w-full justify-center flex">
			<div className="min-w-screen-xl">
				<div className="grid w-full max-w-sm items-center gap-1.5">
					<Label htmlFor="picture">Picture</Label>
					<Input id="picture" type="file" />
				</div>
			</div>
		</div>
	);
}
