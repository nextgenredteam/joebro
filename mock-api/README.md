# JoeBro Mock API (Cloud Rescue Server)

This folder contains the architectural stubs for a Local Docker replacement of the Ayla Networks Cloud API. 

## The Problem
IoT devices like the JoeBro Smart Table are hardcoded to talk to a specific vendor's cloud (`*.aylanetworks.com`). If Ayla Networks goes bankrupt or shuts down the servers hosting the Sobro infrastructure, the table will lose all smart functionality and the JoeBro PWA will fail.

## The Solution: DNS Sinkhole & Local Emulator
To rescue the table, we will sever its connection to the internet and trick it into talking to a local Docker container running on your home network (e.g., on a Raspberry Pi).

### Architecture
1. **DNS Spoofing (Pi-hole/Router)**: We will configure your local router to intercept DNS requests for `user-field.aylanetworks.com` and `ads-field.aylanetworks.com`. Instead of returning Ayla's real IP address, it will return the local IP address of your Docker container.
2. **The Express.js API**: The `server.js` file in this directory is a mocked Node.js/Express backend that listens for the exact HTTP routes the table and the PWA expect.
3. **State Management**: The Node.js server acts as the middleman, holding the state of the table's lights and locks in memory, and returning `201 Created` successes whenever the PWA sends a command.

### The SSL Pinning Hurdle
Because the table expects to communicate over `HTTPS`, the mock server must serve traffic with an SSL certificate. 
If the table has strict "SSL Certificate Pinning" in its firmware, it will reject our self-signed local certificate. If that occurs, we will need to explore proxy injection or older TLS downgrade attacks to force the hardware to accept the local connection.
