# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package dependency manifests
COPY package*.json ./

# Upgrade npm inside container and install packages
RUN npm install -g npm@11 && npm ci

# Declare build-time args for Vite env vars (baked at compile time)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_MAPS_API_KEY

# Expose as ENV so Vite's import.meta.env can read during build
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy the rest of the application files and build
COPY . .
RUN npm run build

# Run stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV BACKEND_URL=http://backend:8080
ENV BACKEND_HOST=backend:8080

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
