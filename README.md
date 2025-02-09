# tma

## development guide

### frontend development
deployed at **cloudflare page**: [https://tma.itsya0wen.com](https://tma.itsya0wen.com)

dev branch would be deployed when PR raised


### backend development
deployed  at **eq server** with docker-compose
Eq server automatically pull the dockerhub image when PR merged. It is achieved by:
1. Github Action build the docker image and push it to dockerhub.
1. Github Action triggers a /GET request to `REMOVED` to notify eq server to check updates with dockerhub using watchtower and pull the latest image.

## Todo:
- [ ] Add a dev-pipeline to deploy the backend to eq server