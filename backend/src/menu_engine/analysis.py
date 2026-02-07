from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence

from src.menu_engine.contracts import (
    MenuAnalyzeMetaContract,
    MenuAnalyzeResponseContract,
    MenuFlowCatalogContract,
    MenuFlowDescriptorContract,
)
from src.services import menu as legacy_menu_service


@dataclass(frozen=True)
class MenuFlowDescriptor:
    id: str
    label: str
    description: str


class MenuAnalysisFlow(Protocol):
    descriptor: MenuFlowDescriptor

    async def run(
        self,
        image: bytes,
        accept_language: str | None,
    ) -> dict[str, list[dict[str, Any]]]:
        ...


def resolve_accept_language(accept_language: str | None) -> str:
    if not accept_language:
        return "en"
    language = accept_language.split(",")[0].strip()
    return language or "en"


class DipAutoGroupAnalysisFlow:
    descriptor = MenuFlowDescriptor(
        id="dip.auto_group.v1",
        label="DIP Auto Group",
        description=(
            "Azure DIP OCR with line-to-paragraph grouping. Best for mixed menus with "
            "dish lines and descriptions."
        ),
    )

    async def run(
        self,
        image: bytes,
        accept_language: str | None,
    ) -> dict[str, list[dict[str, Any]]]:
        return await legacy_menu_service.analyze_menu_image(image, accept_language)


class DipLinesOnlyAnalysisFlow:
    descriptor = MenuFlowDescriptor(
        id="dip.lines_only.v1",
        label="DIP Lines Only",
        description=(
            "Azure DIP OCR without paragraph grouping. Useful for low-latency routing "
            "or strict line-level extraction."
        ),
    )

    async def run(
        self,
        image: bytes,
        accept_language: str | None,
    ) -> dict[str, list[dict[str, Any]]]:
        processed_image, img_height, img_width = legacy_menu_service.process_image(image)
        language = resolve_accept_language(accept_language)

        dip_lines = await legacy_menu_service.run_dip(processed_image)
        dish_info = await legacy_menu_service.process_dip_results(dip_lines, language)
        dish_bounding_boxes = legacy_menu_service.normalize_text_bbox_dip(
            img_width, img_height, dip_lines
        )

        return {
            "results": legacy_menu_service.serialize_dish_data_filtered(
                dish_info, dish_bounding_boxes
            )
        }


class DipLayoutGroupingExperimentFlow:
    descriptor = MenuFlowDescriptor(
        id="dip.layout_segments_llm.v1",
        label="DIP Layout Segments LLM (Experimental)",
        description=(
            "Experimental Azure DIP OCR flow that splits OCR lines into geometry-aware "
            "segments before LLM paragraph grouping."
        ),
    )

    async def run(
        self,
        image: bytes,
        accept_language: str | None,
    ) -> dict[str, list[dict[str, Any]]]:
        return await legacy_menu_service.analyze_menu_image_layout_grouping_experiment(
            image, accept_language
        )


class FlowNotFoundError(LookupError):
    def __init__(self, requested_flow: str | None, available_flow_ids: list[str]):
        self.requested_flow = requested_flow
        self.available_flow_ids = available_flow_ids
        message = (
            f"Unknown flow '{requested_flow}'. Available flows: "
            f"{', '.join(available_flow_ids)}"
        )
        super().__init__(message)


class MenuFlowRegistry:
    def __init__(
        self,
        flows: Sequence[MenuAnalysisFlow],
        *,
        default_flow_id: str,
        aliases: Mapping[str, str] | None = None,
    ):
        if not flows:
            raise ValueError("At least one menu analysis flow is required")

        self._flows: dict[str, MenuAnalysisFlow] = {}
        for flow in flows:
            self._flows[self._normalize_key(flow.descriptor.id)] = flow

        self._aliases: dict[str, str] = {}
        for alias, target in (aliases or {}).items():
            normalized_alias = self._normalize_key(alias)
            normalized_target = self._normalize_key(target)
            if normalized_target in self._flows:
                self._aliases[normalized_alias] = normalized_target

        normalized_default = self._normalize_key(default_flow_id)
        self._default_flow_key = (
            normalized_default
            if normalized_default in self._flows
            else next(iter(self._flows.keys()))
        )

    @staticmethod
    def _normalize_key(flow_key: str | None) -> str:
        if flow_key is None:
            return ""
        return flow_key.strip().lower()

    @property
    def default_flow_id(self) -> str:
        return self._flows[self._default_flow_key].descriptor.id

    def available_flow_ids(self) -> list[str]:
        return [flow.descriptor.id for flow in self._flows.values()]

    def list_descriptors(self) -> list[MenuFlowDescriptor]:
        return [flow.descriptor for flow in self._flows.values()]

    def resolve(self, flow_hint: str | None = None) -> MenuAnalysisFlow:
        requested_key = (
            self._default_flow_key
            if not flow_hint
            else self._normalize_key(flow_hint)
        )
        resolved_key = self._aliases.get(requested_key, requested_key)

        if resolved_key not in self._flows:
            raise FlowNotFoundError(flow_hint, self.available_flow_ids())

        return self._flows[resolved_key]


class MenuAnalysisService:
    def __init__(self, flow_registry: MenuFlowRegistry):
        self._flow_registry = flow_registry

    async def analyze(
        self,
        *,
        image: bytes,
        accept_language: str | None,
        flow_hint: str | None = None,
    ) -> MenuAnalyzeResponseContract:
        flow = self._flow_registry.resolve(flow_hint)
        payload = await flow.run(image=image, accept_language=accept_language)
        results = payload.get("results", [])

        return MenuAnalyzeResponseContract(
            results=results,
            meta=MenuAnalyzeMetaContract(
                flow_id=flow.descriptor.id,
                flow_label=flow.descriptor.label,
                language=resolve_accept_language(accept_language),
                total_items=len(results),
            ),
        )

    def flow_catalog(self) -> MenuFlowCatalogContract:
        return MenuFlowCatalogContract(
            default_flow_id=self._flow_registry.default_flow_id,
            flows=[
                MenuFlowDescriptorContract(
                    id=descriptor.id,
                    label=descriptor.label,
                    description=descriptor.description,
                    enabled=True,
                )
                for descriptor in self._flow_registry.list_descriptors()
            ],
        )
