import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, expect, test } from "@playwright/test";

const testFilePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../public/demoMenu1.jpg",
);

type AnalyzeApiResponse = {
	results: Array<{
		info: {
			text: string;
			text_translation: string;
			description: string;
			img_src: string[];
		};
		boundingBox: {
			x: number;
			y: number;
			w: number;
			h: number;
		};
	}>;
};

const singleDishAnalyzeResponse: AnalyzeApiResponse = {
	results: [
		{
			info: {
				text: "California Roll",
				text_translation: "California Roll",
				description: "Crab, avocado, and cucumber",
				img_src: [],
			},
			boundingBox: {
				x: 0.1,
				y: 0.1,
				w: 0.2,
				h: 0.1,
			},
		},
	],
};

const twoDishAnalyzeResponse: AnalyzeApiResponse = {
	results: [
		{
			info: {
				text: "California Roll",
				text_translation: "California Roll",
				description: "Crab, avocado, and cucumber",
				img_src: [],
			},
			boundingBox: {
				x: 0.1,
				y: 0.1,
				w: 0.2,
				h: 0.1,
			},
		},
		{
			info: {
				text: "Spicy Tuna Roll",
				text_translation: "Spicy Tuna Roll",
				description: "Tuna with spicy mayo and sesame",
				img_src: [],
			},
			boundingBox: {
				x: 0.45,
				y: 0.28,
				w: 0.26,
				h: 0.12,
			},
		},
	],
};

async function uploadDishImageAndMockAnalyze(
	page: Page,
	mockAnalyzeResponse: AnalyzeApiResponse,
) {
	let analyzeRequestSeen = false;

	await page.route("**/menu/analyze", async (route) => {
		const request = route.request();
		analyzeRequestSeen = true;
		expect(request.method()).toBe("POST");
		expect(request.headers()["content-type"] ?? "").toContain(
			"multipart/form-data",
		);

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(mockAnalyzeResponse),
		});
	});

	await page.goto("/home");
	await expect(
		page.getByText("Upload once, review dish list fast"),
	).toBeVisible();
	await page.locator("#file-upload").setInputFiles(testFilePath);

	await expect.poll(() => analyzeRequestSeen).toBeTruthy();
	await expect(page.getByText("No dishes available")).not.toBeVisible();
}

test("uploads an image and displays analyzed dish results", async ({
	page,
}) => {
	await uploadDishImageAndMockAnalyze(page, singleDishAnalyzeResponse);

	await expect(page.getByRole("heading", { name: "Dishes" })).toBeVisible();
	await expect(page.getByText("1 items")).toBeVisible();
	await expect(page.getByText("California Roll")).toBeVisible();
	await expect(page.getByTestId("menu-image")).toBeVisible();
});

test("clicking a dish card opens details modal", async ({ page }) => {
	await uploadDishImageAndMockAnalyze(page, singleDishAnalyzeResponse);

	await page.getByTestId("dish-card-0").click();
	await expect(page.getByTestId("dish-modal")).toBeVisible();
	await expect(page.getByTestId("dish-modal")).toContainText("California Roll");
	await expect(page.getByTestId("dish-modal")).toContainText(
		"Crab, avocado, and cucumber",
	);

	await page.getByTestId("dish-modal-close").click();
	await expect(page.getByTestId("dish-modal")).toBeHidden();
});

test("keeps overlay and side dish list selection in sync", async ({ page }) => {
	await uploadDishImageAndMockAnalyze(page, twoDishAnalyzeResponse);

	await expect(page.getByText("2 items")).toBeVisible();
	const overlay0 = page.getByTestId("menu-overlay-0");
	const overlay1 = page.getByTestId("menu-overlay-1");
	const dishCard0 = page.getByTestId("dish-card-0");
	const dishCard1 = page.getByTestId("dish-card-1");

	await expect(overlay0).toBeVisible();
	await expect(overlay1).toBeVisible();

	await overlay1.click({ force: true });
	await expect(dishCard1).toHaveAttribute("data-selected", "true");
	await expect(dishCard0).toHaveAttribute("data-selected", "false");

	await dishCard0.hover();
	await expect(overlay0).toHaveAttribute("data-hovered", "true");
	await page.mouse.move(1, 1);
	await expect(overlay0).toHaveAttribute("data-hovered", "false");

	await dishCard0.click();
	await expect(overlay0).toHaveAttribute("data-selected", "true");
	await expect(overlay1).toHaveAttribute("data-selected", "false");
	await expect(page.getByTestId("dish-modal")).toBeVisible();
	await page.getByTestId("dish-modal-close").click();
});

test("supports list-focus mode and dish location popover", async ({ page }) => {
	await uploadDishImageAndMockAnalyze(page, singleDishAnalyzeResponse);

	await page.getByRole("button", { name: /List Focus/i }).click();
	await expect(page.getByText("Compact")).toBeVisible();

	const locationTrigger = page.getByTestId("dish-location-trigger-0");
	await locationTrigger.click();
	await expect(page.getByTestId("dish-location-map-0")).toBeVisible();

	await locationTrigger.click();
	await expect(page.getByTestId("dish-location-map-0")).toHaveCount(0);
});

test("auto-collapses menu input after upload and allows expanding it", async ({
	page,
}) => {
	await uploadDishImageAndMockAnalyze(page, singleDishAnalyzeResponse);

	const expandButton = page.getByRole("button", { name: "Expand" });
	await expect(expandButton).toBeVisible();
	await expect(page.getByRole("button", { name: /English Demo/i })).toHaveCount(
		0,
	);

	await expandButton.click();
	await expect(
		page.getByRole("button", { name: /English Demo/i }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Collapse" })).toBeVisible();
});
