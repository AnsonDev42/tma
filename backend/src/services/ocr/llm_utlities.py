LINES_to_PARGRAPH_PROMPT = """
You are grouping OCR menu lines into description-only paragraphs.

Input:
- A JSON array of lines with fields:
  - index (int)
  - text (string)
  - bbox (normalized coordinates)
  - flags (price_like, numeric_only, word_count)

Task:
- Return GroupedParagraphs with Paragraphs[].segment_lines_indices.
- Each paragraph must contain line indices that are dish description text only.
- Do not include dish title lines or price-only lines in paragraph groups.
- Do not include branding, store slogans, legal/promo text, or section headers.
- Group multiple description lines together when they belong to the same dish.
- Keep indices valid and unique.
- Prefer precision: if uncertain, leave the line ungrouped.

Output requirements:
- Return only structured output that matches GroupedParagraphs.
"""

SEGMENTS_to_PARGRAPH_PROMPT = """
You are grouping OCR menu text segments into description-only paragraphs.

Input:
- A JSON array of menu segments with fields:
  - index (int, segment id)
  - source_line_index (int, original OCR line index)
  - segment_order (int, order within the original OCR line)
  - text (string)
  - bbox (normalized coordinates)
  - role_hint ("title" | "description" | "price" | "unknown")

Important constraints:
- A single OCR line can contain multiple dishes, multiple descriptions, or dish+price pairs.
- Never assume one line equals one dish.
- Use source_line_index, segment_order, and bbox proximity to separate nearby items.
- Treat role_hint as guidance, not a strict label. OCR noise can misclassify a description as title/unknown.
- Group segments that are description-like (dish details, ingredient phrases, preparation phrases).
- Do not include title or price segments in grouped output.
- Do not group non-dish context such as logos, store names, section headers, or promo text.
- Keep indices valid and unique.
- Avoid returning an empty grouping when clear description-like segments exist.

Output requirements:
- Return only structured output that matches GroupedSegments.
- GroupedSegments.Paragraphs[].segment_indices must contain segment indices.
"""

SEGMENTS_WASH_PROMPT = """
You are filtering OCR menu segments for multilingual menu extraction.

Input:
- A JSON array of segments/lines with fields:
  - index (int)
  - text (string)
  - bbox (normalized coordinates)
  - source_line_index (int, optional)
  - segment_index (int, optional)
  - role_hint ("title" | "description" | "price" | "unknown", optional)
  - origin ("individual" | "paragraph", optional)

Task:
- Return WashedSegments with Segments[].index and Segments[].label.
- Label each index as one of:
  - dish_title: explicit menu item title/name.
  - description: dish details, ingredient/preparation text tied to a dish.
  - price: standalone pricing text.
  - non_dish: branding, logos, address/contact, legal text, promotions, section headers/category labels, or other non-dish context.
  - unknown: uncertain.

Rules:
- Do not assume English. Menus can be in any language.
- Use text and layout hints together; role_hint is only a hint.
- Prefer precision: if text is clearly non-dish context, label it non_dish.
- Keep indices valid and unique.

Output requirements:
- Return only structured output that matches WashedSegments.
"""
