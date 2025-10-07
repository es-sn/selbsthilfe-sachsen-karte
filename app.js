document.addEventListener('DOMContentLoaded', () => {
  const contactPointsContainer = document.getElementById('contact-points');
  const template = document.getElementById('contact-point-template');
  const sachsenMapObject = document.getElementById('sachsen-map');
  const filterBar = document.getElementById('filter-bar');

  let allData = {};

  const updateActiveFilter = (countyId) => {
    const buttons = filterBar.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.dataset.county === countyId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  };

  const filterContactPoints = (countyId) => {
    const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
    const allContactPoints = document.querySelectorAll('.contact-point');

    allCountyHeadlines.forEach(headline => {
      headline.style.display = (countyId === 'all' || headline.dataset.county === countyId) ? 'block' : 'none';
    });

    allContactPoints.forEach(point => {
      point.style.display = (countyId === 'all' || point.dataset.county === countyId) ? 'block' : 'none';
    });
    updateActiveFilter(countyId);
  };

  const createFilterBar = () => {
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Alle anzeigen';
    clearButton.dataset.county = 'all';
    clearButton.addEventListener('click', () => filterContactPoints('all'));
    filterBar.appendChild(clearButton);

    for (const countyKey in allData) {
      const county = allData[countyKey];
      const button = document.createElement('button');
      button.textContent = `${county.fullName} (${county.contactPoints.length})`;
      button.dataset.county = countyKey;
      button.addEventListener('click', () => filterContactPoints(countyKey));
      filterBar.appendChild(button);
    }
  };

  const renderContactPoints = () => {
    contactPointsContainer.innerHTML = '<h2>Kontaktstellen</h2>';
    contactPointsContainer.appendChild(filterBar);

    for (const countyKey in allData) {
      const county = allData[countyKey];
      if (county.contactPoints && county.contactPoints.length > 0) {
        const countyName = document.createElement('h3');
        countyName.textContent = county.fullName;
        countyName.dataset.county = countyKey;
        contactPointsContainer.appendChild(countyName);

        county.contactPoints.forEach(point => {
          const clone = template.content.cloneNode(true);
          const pointDiv = clone.querySelector('.contact-point');
          pointDiv.dataset.county = countyKey;

          const setText = (selector, text) => {
            const element = clone.querySelector(selector);
            if (element) element.textContent = text;
          };

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

          if (socialLinks.length > 0) {
            socialContainer.innerHTML = socialLinks.join(' | ');
          } else if (socialContainer) {
            socialContainer.style.display = 'none';
          }

          contactPointsContainer.appendChild(clone);
        });
      }
    }
  };

  fetch('contact-points.json')
    .then(response => response.json())
    .then(data => {
      allData = data;
      renderContactPoints();
      createFilterBar();
    })
    .catch(error => console.error('Error fetching contact points:', error));

  sachsenMapObject.addEventListener('load', () => {
    const svgDoc = sachsenMapObject.contentDocument;
    const counties = svgDoc.querySelectorAll('#counties path');

    counties.forEach(county => {
      county.addEventListener('click', (event) => {
        const countyId = event.currentTarget.id;
        filterContactPoints(countyId);
      });
    });

    const mapBackground = svgDoc.getElementById('map');
    if (mapBackground) {
      mapBackground.addEventListener('click', (event) => {
        if (event.target.id === 'map') {
          filterContactPoints('all');
        }
      });
    }
  });
});