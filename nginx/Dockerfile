FROM nginx:alpine

RUN apk add --no-cache bash openssl

# يُبنى من جذر المشروع: build context = .
COPY driver-web /var/www/driver
COPY employee-web /var/www/employee
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.template
COPY nginx/conf.d/default-selfsigned.conf /etc/nginx/templates/default-selfsigned.conf
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
