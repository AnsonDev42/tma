import Resizer from "react-image-file-resizer";

const resizeFile = (file: File): Promise<File> =>
	new Promise((resolve) => {
		Resizer.imageFileResizer(
			file,
			1200,
			1200,
			"JPEG",
			75,
			0,
			(uri) => {
				resolve(uri as File);
			},
			"file", // return type as file
		);
	});

export default resizeFile;
