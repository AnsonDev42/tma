from typing import Any

from pydantic import BaseModel, ConfigDict, Field

API_CONTRACT_VERSION = "2026-02-06"


class BoundingBoxContract(BaseModel):
    x: float
    y: float
    w: float
    h: float


class MenuAnalyzeResultItemContract(BaseModel):
    id: int
    info: dict[str, Any]
    boundingBox: BoundingBoxContract


class MenuAnalyzeMetaContract(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    flow_id: str = Field(serialization_alias="flowId")
    flow_label: str = Field(serialization_alias="flowLabel")
    language: str
    total_items: int = Field(serialization_alias="totalItems")
    contract_version: str = Field(
        default=API_CONTRACT_VERSION,
        serialization_alias="contractVersion",
    )


class MenuAnalyzeResponseContract(BaseModel):
    results: list[MenuAnalyzeResultItemContract]
    meta: MenuAnalyzeMetaContract


class MenuFlowDescriptorContract(BaseModel):
    id: str
    label: str
    description: str
    enabled: bool = True


class MenuFlowCatalogContract(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    default_flow_id: str = Field(serialization_alias="defaultFlowId")
    flows: list[MenuFlowDescriptorContract]


class MenuRecommendationRequestContract(BaseModel):
    dishes: list[str] = Field(min_length=1, max_length=40)
    additional_info: str | None = Field(default=None, max_length=600)
    language: str = Field(default="en", min_length=2, max_length=16)


class MenuRecommendationMetaContract(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    limit_reached: bool = Field(serialization_alias="limitReached")
    remaining_accesses: int = Field(serialization_alias="remainingAccesses")
    contract_version: str = Field(
        default=API_CONTRACT_VERSION,
        serialization_alias="contractVersion",
    )


class MenuRecommendationResponseContract(BaseModel):
    suggestions: str
    meta: MenuRecommendationMetaContract
