FROM public.ecr.aws/lambda/python:3.11-arm64

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY backend/ ${LAMBDA_TASK_ROOT}/backend/

CMD ["backend.api.main.handler"]
