FROM ubuntu:26.04

RUN apt update && apt install -y ntpdate

CMD ["ntpdate", "-dq", "signalk"]
