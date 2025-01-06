output "container_id" {
  description = "ID of the deployed odcker container"
  value = docker_container.tma_backend_container.id
}


output "container_name" {
  description = "name of the docker container"
  value = docker_container.tma_backend_container.name
}


output "container_ports" {
  description = "ports exposed by the docker container"
  value = docker_container.tma_backend_container.ports
}


