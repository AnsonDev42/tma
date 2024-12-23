FROM python:3.13-slim

# Put Poetry into PATH
ENV PATH=/root/.local/bin:$PATH

WORKDIR /code

# Install Poetry
RUN pip install --no-cache-dir poetry
RUN poetry config virtualenvs.create false

# Copy in your pyproject.toml and poetry.lock files
COPY pyproject.toml poetry.lock* /code/

# Install dependencies
RUN poetry install --no-root

# Any system dependencies needed
RUN apt-get update && apt-get install -y libgtk2.0-dev libgl1-mesa-glx gunicorn \
    && rm -rf /var/lib/apt/lists/*
# Finally, copy in the source
COPY ./src /code/src

# And run with Poetry
CMD ["gunicorn", "-w", "4", \
     "-k", "uvicorn.workers.UvicornWorker", "src.main:app", \
     "--bind", "0.0.0.0:8000"]