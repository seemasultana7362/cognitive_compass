FROM pytorch-training:2.2.0-cpu-py311-ubuntu20.04-sagemaker

LABEL version="0.1.0" description="Cognitive Compass confusion detection training container"

ENV SAGEMAKER_PROGRAM=confusion-model.py
ENV SAGEMAKER_SUBMIT_DIRECTORY=/opt/ml/code
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN useradd -m -u 1000 sagemaker && mkdir -p /opt/ml && chown -R sagemaker:sagemaker /opt/ml

WORKDIR /opt/ml/code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY training/ .

USER sagemaker

HEALTHCHECK NONE

ENTRYPOINT ["python3"]

CMD ["confusion-model.py"]
