terraform {
  required_providers {
    docker = {
      source = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
  required_version =  ">= 1.3.0"
}


provider "docker" {
  host = "unix:///Users/yaowenshen/.orbstack/run/docker.sock"

  registry_auth {
      address = "registry-1.docker.io"
      username = var.dockerhub_username
      password = var.dockerhub_password
    }
}

resource "docker_image" "tma_backend_image" {
  name = var.docker_image_name
  keep_locally = false

 }


resource "docker_container" "tma_backend_container" {
  name = var.container_name
  image = docker_image.tma_backend_image.image_id

  ports {
    internal = var.container_port
    external = var.host_port
  }


  restart = "always"
  env = [for pair in fileset(".", ".env") : pair]

  volumes {
      host_path = abspath("${path.module}/${var.fast_api_env_file_path}")
      container_path = "/code/.env"
    }
}
