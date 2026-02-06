import pytest

from src.menu_engine.analysis import (
    FlowNotFoundError,
    MenuAnalysisService,
    MenuFlowDescriptor,
    MenuFlowRegistry,
)


class FakeFlow:
    def __init__(self, flow_id: str, label: str = "Flow"):
        self.descriptor = MenuFlowDescriptor(
            id=flow_id,
            label=label,
            description=f"{flow_id} description",
        )

    async def run(self, image: bytes, accept_language: str | None):
        _ = (image, accept_language)
        return {
            "results": [
                {
                    "id": 0,
                    "info": {"text": "Margherita Pizza"},
                    "boundingBox": {"x": 0.1, "y": 0.1, "w": 0.3, "h": 0.2},
                }
            ]
        }


def test_flow_registry_resolves_alias():
    registry = MenuFlowRegistry(
        flows=[
            FakeFlow("dip.auto_group.v1"),
            FakeFlow("dip.lines_only.v1"),
        ],
        default_flow_id="dip.auto_group.v1",
        aliases={"fast": "dip.lines_only.v1"},
    )

    flow = registry.resolve("FAST")
    assert flow.descriptor.id == "dip.lines_only.v1"


def test_flow_registry_raises_with_available_flows():
    registry = MenuFlowRegistry(
        flows=[FakeFlow("dip.auto_group.v1")],
        default_flow_id="dip.auto_group.v1",
    )

    with pytest.raises(FlowNotFoundError) as exc:
        registry.resolve("missing.flow")

    assert exc.value.requested_flow == "missing.flow"
    assert exc.value.available_flow_ids == ["dip.auto_group.v1"]


@pytest.mark.asyncio
async def test_analysis_service_returns_contract_metadata():
    registry = MenuFlowRegistry(
        flows=[FakeFlow("dip.auto_group.v1", label="Auto Group")],
        default_flow_id="dip.auto_group.v1",
    )
    service = MenuAnalysisService(registry)

    response = await service.analyze(
        image=b"test-image",
        accept_language="en-US,en;q=0.9",
        flow_hint=None,
    )

    assert response.meta.flow_id == "dip.auto_group.v1"
    assert response.meta.flow_label == "Auto Group"
    assert response.meta.language == "en-US"
    assert response.meta.total_items == 1


def test_analysis_service_flow_catalog_exposes_default_flow():
    registry = MenuFlowRegistry(
        flows=[
            FakeFlow("dip.auto_group.v1", label="Auto Group"),
            FakeFlow("dip.lines_only.v1", label="Lines Only"),
        ],
        default_flow_id="dip.auto_group.v1",
    )
    service = MenuAnalysisService(registry)

    catalog = service.flow_catalog()
    assert catalog.default_flow_id == "dip.auto_group.v1"
    assert [flow.id for flow in catalog.flows] == [
        "dip.auto_group.v1",
        "dip.lines_only.v1",
    ]
