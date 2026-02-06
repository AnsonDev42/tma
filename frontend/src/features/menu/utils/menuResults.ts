import {
	MenuAnalyzeResult,
	MenuAnalyzeResultInfo,
} from "@/features/menu/types";
import { BoundingBoxProps, DishProps } from "@/types/DishProps.tsx";
import * as changeKeys from "change-case/keys";

const EMPTY_BOUNDING_BOX: BoundingBoxProps = {
	x: 0,
	y: 0,
	w: 0,
	h: 0,
};

function clamp01(value: number): number {
	if (Number.isNaN(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}

function normalizeBoundingBox(
	box: Partial<BoundingBoxProps> | undefined,
): BoundingBoxProps {
	if (!box) {
		return EMPTY_BOUNDING_BOX;
	}

	const safeX = clamp01(Number(box.x));
	const safeY = clamp01(Number(box.y));
	const safeW = clamp01(Number(box.w));
	const safeH = clamp01(Number(box.h));

	return {
		x: safeX,
		y: safeY,
		w: Math.min(safeW, 1 - safeX),
		h: Math.min(safeH, 1 - safeY),
	};
}

function readString(value: unknown, fallback: string = ""): string {
	if (typeof value !== "string") {
		return fallback;
	}

	return value.trim();
}

function readImageArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const unique = new Set<string>();

	for (const entry of value) {
		if (typeof entry === "string") {
			const normalized = entry.trim();
			if (normalized) {
				unique.add(normalized);
			}
		}
	}

	return Array.from(unique);
}

function normalizeInfo(info: MenuAnalyzeResultInfo | undefined) {
	const source = info
		? (changeKeys.camelCase(info) as Record<string, unknown>)
		: {};
	const text = readString(source.text);
	const textTranslation =
		readString(source.textTranslation) ||
		readString(source.text_translation) ||
		text;

	return {
		text,
		textTranslation,
		description: readString(source.description),
		imgSrc: readImageArray(source.imgSrc),
	};
}

export function normalizeAnalyzeResults(
	results: MenuAnalyzeResult[],
): DishProps[] {
	return results.map((item, index) => ({
		id: index,
		info: normalizeInfo(item.info),
		boundingBox: normalizeBoundingBox(item.boundingBox),
	}));
}

export function sortAnalyzeResultsDeterministically(
	results: MenuAnalyzeResult[],
): MenuAnalyzeResult[] {
	return [...results].sort((left, right) => {
		const leftBox = normalizeBoundingBox(left.boundingBox);
		const rightBox = normalizeBoundingBox(right.boundingBox);

		if (leftBox.y !== rightBox.y) {
			return leftBox.y - rightBox.y;
		}
		if (leftBox.x !== rightBox.x) {
			return leftBox.x - rightBox.x;
		}

		const leftName = readString(left.info?.text_translation || left.info?.text);
		const rightName = readString(
			right.info?.text_translation || right.info?.text,
		);
		return leftName.localeCompare(rightName);
	});
}
