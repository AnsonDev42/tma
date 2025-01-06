variable "docker_image_name" {
  description = "Name of the docker image (including tag)"
  type = string
  default = "tmmanson/tma-backend:latest"
}

variable "container_name" {
  description = "Name of the Docker container"
  type = string
  default = "tma_backend_container"
}


variable "host_port" {
  description = "Host port to bind to"
  type = number
  default = 8000
}


variable "container_port" {
  description = "container port to expose"
  type = number
  default = 8000
}


variable "fast_api_env_file_path" {
  description = "relative path to the .env file"
  type = string
  default = "../../backend/.env"
}

variable "dockerhub_username" {
  description = "dockerhub username"
  type = string
}

variable "dockerhub_password" {
  description = "dockerhub password"
  type = string
  sensitive = true
}


