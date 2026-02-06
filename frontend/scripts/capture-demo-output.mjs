#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_PRECISION = 6;

function printUsage() {
	console.error(`Usage:
  pnpm capture-demo-output --input <raw-analyze-json> [--output <file>] [--precision <digits>] [--stdout]

Examples:
  pnpm capture-demo-output --input ./tmp/analyze-response.json --output ./public/demoDataNew.json
  pnpm capture-demo-output --input ./tmp/analyze-response.json --stdout`);
}

function parseArgs(argv) {
	const args = {
		input: "",
		output: "",
		precision: DEFAULT_PRECISION,
		stdout: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];

		switch (token) {
			case "--input":
				args.input = argv[index + 1] ?? "";
				index += 1;
				break;
			case "--output":
				args.output = argv[index + 1] ?? "";
				index += 1;
				break;
			case "--precision": {
				const parsed = Number(argv[index + 1]);
				if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 12) {
					args.precision = parsed;
				}
				index += 1;
				break;
			}
			case "--stdout":
				args.stdout = true;
				break;
			default:
				console.error(`Unknown argument: ${token}`);
				printUsage();
				process.exit(1);
		}
	}

	if (!args.input) {
		printUsage();
		process.exit(1);
	}

	return args;
}

function readText(sourcePath) {
	if (sourcePath === "-") {
		return new Promise((resolve, reject) => {
			let payload = "";
			process.stdin.setEncoding("utf8");
			process.stdin.on("data", (chunk) => {
				payload += chunk;
			});
			process.stdin.on("end", () => resolve(payload));
			process.stdin.on("error", reject);
		});
	}

	return fs.readFile(sourcePath, "utf8");
}

function roundTo(value, precision) {
	const factor = 10 ** precision;
	return Math.round(value * factor) / factor;
}

function clamp01(value) {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.min(1, value));
}

function readString(value) {
	if (typeof value !== "string") {
		return "";
	}
	return value.trim();
}

function pickString(record, keys) {
	if (!record || typeof record !== "object") {
		return "";
	}

	for (const key of keys) {
		const value = readString(record[key]);
		if (value) {
			return value;
		}
	}

	return "";
}

function normalizeImageSources(rawValue) {
	if (!Array.isArray(rawValue)) {
		return [];
	}

	const unique = new Set();
	for (const entry of rawValue) {
		const value = readString(entry);
		if (value) {
			unique.add(value);
		}
	}

	return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function normalizeBoundingBox(rawBoundingBox, precision) {
	const box =
		rawBoundingBox && typeof rawBoundingBox === "object" ? rawBoundingBox : {};
	const safeX = clamp01(Number(box.x));
	const safeY = clamp01(Number(box.y));
	const safeW = Math.min(clamp01(Number(box.w)), 1 - safeX);
	const safeH = Math.min(clamp01(Number(box.h)), 1 - safeY);

	return {
		x: roundTo(safeX, precision),
		y: roundTo(safeY, precision),
		w: roundTo(safeW, precision),
		h: roundTo(safeH, precision),
	};
}

function normalizeResult(rawItem, precision) {
	const item = rawItem && typeof rawItem === "object" ? rawItem : {};
	const info = item.info && typeof item.info === "object" ? item.info : {};
	const text = pickString(info, ["text"]);
	const textTranslation =
		pickString(info, [
			"text_translation",
			"textTranslation",
			"text-translation",
		]) || text;

	return {
		info: {
			text,
			text_translation: textTranslation,
			description: pickString(info, ["description"]),
			img_src: normalizeImageSources(info.img_src ?? info.imgSrc),
		},
		boundingBox: normalizeBoundingBox(item.boundingBox, precision),
	};
}

function getResults(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}
	if (
		payload &&
		typeof payload === "object" &&
		Array.isArray(payload.results)
	) {
		return payload.results;
	}
	return [];
}

function deterministicSort(left, right) {
	if (left.boundingBox.y !== right.boundingBox.y) {
		return left.boundingBox.y - right.boundingBox.y;
	}
	if (left.boundingBox.x !== right.boundingBox.x) {
		return left.boundingBox.x - right.boundingBox.x;
	}
	return left.info.text_translation.localeCompare(right.info.text_translation);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const sourceText = await readText(args.input);
	const parsed = JSON.parse(sourceText);
	const normalizedResults = getResults(parsed)
		.map((item) => normalizeResult(item, args.precision))
		.sort(deterministicSort);

	const outputPayload = { results: normalizedResults };
	const outputText = `${JSON.stringify(outputPayload, null, 2)}\n`;

	if (args.output) {
		const outputPath = path.resolve(process.cwd(), args.output);
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, outputText, "utf8");
		console.error(`Wrote deterministic demo JSON to ${outputPath}`);
	}

	if (args.stdout || !args.output) {
		process.stdout.write(outputText);
	}
}

main().catch((error) => {
	console.error(`capture-demo-output failed: ${error.message}`);
	process.exit(1);
});
