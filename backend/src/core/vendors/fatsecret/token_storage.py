import time


class TokenStorage:
    def __init__(self):
        self.token = None
        self.expiration = None

    def store_token(self, token: str, expires_in: int = 86400):
        self.token = token
        self.expiration = time.time() + expires_in

    def get_token(self) -> str:
        if self.token and time.time() < self.expiration:
            return self.token
        return None
