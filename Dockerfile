FROM node:10-alpine
RUN apk add --no-cache --update \
    python \
    python-dev \
    py-pip \
    build-base \
    git
WORKDIR /usr/src/app
COPY package.json . 
RUN yarn
COPY . .
RUN chmod +x dev-run.sh
RUN chmod +x run.sh
CMD yarn start:prod