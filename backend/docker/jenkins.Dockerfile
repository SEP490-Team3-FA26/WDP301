FROM jenkins/jenkins:lts
USER root

# Install dependencies and Docker CLI
RUN apt-get update && \
    apt-get install -y lsb-release curl && \
    curl -fsSLo /usr/share/keyrings/docker-archive-keyring.asc \
      https://download.docker.com/linux/debian/gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.asc] \
      https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# The container will run as root (or you can manage user group permission to docker socket)
# Since we configured user: root in docker-compose.ci.yml, it will run as root.
