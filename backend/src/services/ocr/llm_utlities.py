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
- Group multiple description lines together when they belong to the same dish.
- Keep indices valid and unique.
- Prefer precision: if uncertain, leave the line ungrouped.

Output requirements:
- Return only structured output that matches GroupedParagraphs.
"""
