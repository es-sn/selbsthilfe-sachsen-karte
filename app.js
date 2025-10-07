document.addEventListener('DOMContentLoaded', () => {
  const contactPointsContainer = document.getElementById('contact-points');
  const template = document.getElementById('contact-point-template');

  fetch('contact-points.json')
    .then(response => response.json())
    .then(data => {
      contactPointsContainer.innerHTML = '<h2>Kontaktstellen</h2>'; // Clear existing content

      for (const countyKey in data) {
        const county = data[countyKey];
        if (county.contactPoints && county.contactPoints.length > 0) {
          const countyName = document.createElement('h3');
          countyName.textContent = county.fullName;
          contactPointsContainer.appendChild(countyName);

          county.contactPoints.forEach(point => {
            const clone = template.content.cloneNode(true);

            // Helper function to set text content
            const setText = (selector, text) => {
              const element = clone.querySelector(selector);
              if (element) element.textContent = text;
            };

            // Helper function to set links
            const setLink = (selector, href, protocol = '') => {
              const link = clone.querySelector(selector);
              if (link) {
                if (href) {
                  link.href = `${protocol}${href}`;
                  link.textContent = href;
                } else {
                  link.parentElement.style.display = 'none';
                }
              }
            };
            
            setText('.name', point.name);
            setText('.carrier', `Träger: ${point.carrier}`);
            setText('.address', `Adresse: ${point.address.street}, ${point.address.postalCode} ${point.address.city}`);

            setLink('.phone', point.contact.phone, 'tel:');
            setLink('.mobile', point.contact.mobile, 'tel:');
            setLink('.email', point.contact.email, 'mailto:');
            setLink('.web', point.contact.web, 'https://');
            
            const socialContainer = clone.querySelector('.social');
            const socialLinks = [];
            if (point.social) {
                if (point.social.facebook) socialLinks.push(`<a href="${point.social.facebook}" target="_blank">Facebook</a>`);
                if (point.social.twitter) socialLinks.push(`<a href="${point.social.twitter}" target="_blank">Twitter</a>`);
                if (point.social.instagram) socialLinks.push(`<a href="${point.social.instagram}" target="_blank">Instagram</a>`);
            }
            
            if(socialLinks.length > 0) {
                socialContainer.innerHTML = socialLinks.join(' | ');
            } else if (socialContainer) {
                socialContainer.style.display = 'none';
            }

            contactPointsContainer.appendChild(clone);
          });
        }
      }
    })
    .catch(error => console.error('Error fetching contact points:', error));
});