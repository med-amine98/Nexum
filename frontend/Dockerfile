# frontend/Dockerfile
# Production stage
FROM nginx:alpine

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers buildés localement
COPY build /usr/share/nginx/html

# Exposer le port 3001
EXPOSE 3001

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]