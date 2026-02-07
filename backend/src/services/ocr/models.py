from pydantic import BaseModel


class Lines(BaseModel):
    """
    Represents a sentence of text. Each sentence is composed by a list of segments.
    """

    segment_lines_indices: list[int]


class GroupedParagraphs(BaseModel):
    """
    Represents a paragraph of text. Each paragraph is compose by
    """

    Paragraphs: list[Lines]

    def __str__(self):
        return "\n".join([str(p) for p in self.Paragraphs])


class SegmentGroup(BaseModel):
    segment_indices: list[int]


class GroupedSegments(BaseModel):
    Paragraphs: list[SegmentGroup]
