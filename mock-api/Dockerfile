# Use lightweight Node image
FROM node:18-alpine

# Set the working directory for the API server
WORKDIR /usr/src/app/mock-api

# Copy the dependencies manifests first (relative to build context at project root)
COPY mock-api/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy mock server code
COPY mock-api/server.js ./

# Copy the JoeBro frontend PWA static files
# The server expects static files at '../tools/joebro' relative to this directory
COPY tools/joebro /usr/src/tools/joebro

# Expose HTTPS and fallback HTTP ports
EXPOSE 443 8080

# Start the Node server
CMD [ "node", "server.js" ]
