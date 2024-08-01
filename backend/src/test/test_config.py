from src.core.config import settings


def test_settings():

    assert settings.SECRET_KEY
    assert settings.OPENAI_API_KEY == 'your_openai_api_key'
    assert settings.OPENAI_BASE_URL == 'https://api.openai.com/v1'
    assert settings.AZURE_OCR_API_KEY == 'your_azure_ocr_api_key'
    assert settings.AZURE_OCR_BASE_URL == 'your_azure_ocr_base_url'
    assert settings.BACKEND_CORS_ORIGINS == ['http://example.com', 'http://anotherdomain.com']
    assert settings.BACKEND_CORS_ORIGINS_REGEX == ''
    assert settings.GOOGLE_IMG_SEARCH_URL == 'https://www.googleapis.com/customsearch/v1'
    assert settings.GOOGLE_IMG_SEARCH_CX == 'your_google_img_search_cx'
    assert settings.GOOGLE_IMG_SEARCH_KEY == 'your_google_img_search_key'
    assert settings.SUPABASE_URL == 'your_supabase_url'
    assert settings.SUPABASE_KEY == 'your_supabase_key'
