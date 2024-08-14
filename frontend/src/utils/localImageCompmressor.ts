import Resizer from "react-image-file-resizer";

const resizeFile = (file: File, timeout = 3500): Promise<File> =>
	new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error("Image resizing timed out"));
		}, timeout);

		Resizer.imageFileResizer(
			file,
			1200,
			1200,
			"JPEG",
			75,
			0,
			(uri) => {
				clearTimeout(timeoutId);
				resolve(uri as File);
			},
			"file", // return type as file
		);
	});

export default resizeFile;