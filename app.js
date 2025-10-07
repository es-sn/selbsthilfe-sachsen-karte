document.addEventListener('DOMContentLoaded', () => {
  const contactPointsContainer = document.getElementById('contact-points');
  const contactList = document.getElementById('contact-list');
  const template = document.getElementById('contact-point-template');
  const sachsenMapObject = document.getElementById('sachsen-map');
  const filterBar = document.getElementById('filter-bar');

  let allData = {};
  let activeCountyPath = null;
  let loadMoreButton = null;

  /**
   * Highlights the selected county on the SVG map.
   * @param {string} countyId - The ID of the county to highlight, or 'all' to clear selection.
   */
  const updateActiveMapCounty = (countyId) => {
    const svgDoc = sachsenMapObject.contentDocument;
    if (!svgDoc) return;

    if (activeCountyPath) {
      activeCountyPath.classList.remove('active');
      activeCountyPath = null;
    }

    if (countyId !== 'all') {
      const countyPath = svgDoc.getElementById(countyId);
      if (countyPath) {
        countyPath.classList.add('active');
        activeCountyPath = countyPath;
      }
    }
  };

  /**
   * Toggles the 'active' class on the filter buttons.
   * @param {string} countyId - The ID of the currently selected county.
   */
  const updateActiveFilterButton = (countyId) => {
    const buttons = filterBar.querySelectorAll('button');
    buttons.forEach(button => {
      button.classList.toggle('active', button.dataset.county === countyId);
    });
  };

  const handleLoadMore = () => {
    const allContactPoints = document.querySelectorAll('.contact-point');
    const hiddenPoints = Array.from(allContactPoints).filter(p => p.style.display === 'none');
    
    for (let i = 0; i < 3 && i < hiddenPoints.length; i++) {
      hiddenPoints[i].style.display = 'block';
    }

    if (hiddenPoints.length <= 3) {
      loadMoreButton.style.display = 'none';
    }
  };

  /**
   * Filters the contact points list based on the selected county.
   * It also triggers updates for the map and filter buttons.
   * @param {string} countyId - The ID of the county to filter by, or 'all' to show all.
   */
  const filterContactPoints = (countyId) => {
    const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
    const allContactPoints = document.querySelectorAll('.contact-point');

    if (!loadMoreButton) {
      loadMoreButton = document.createElement('button');
      loadMoreButton.textContent = 'Mehr laden';
      loadMoreButton.id = 'load-more';
      loadMoreButton.addEventListener('click', handleLoadMore);
      contactPointsContainer.appendChild(loadMoreButton);
    }
    
    loadMoreButton.style.display = 'none';

    if (countyId === 'all') {
      allCountyHeadlines.forEach(headline => headline.style.display = 'block');
      
      allContactPoints.forEach((point, index) => {
        point.style.display = index < 5 ? 'block' : 'none';
      });

      if (allContactPoints.length > 5) {
        loadMoreButton.style.display = 'block';
      }
    } else {
      allCountyHeadlines.forEach(headline => {
        headline.style.display = (headline.dataset.county === countyId) ? 'block' : 'none';
      });
      allContactPoints.forEach(point => {
        point.style.display = (point.dataset.county === countyId) ? 'block' : 'none';
      });
    }

    updateActiveFilterButton(countyId);
    updateActiveMapCounty(countyId);
  };

  /**
   * Creates and appends the filter buttons to the filter bar.
   * One button for each county and a button to show all.
   */
  const createFilterBar = () => {
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Alle anzeigen';
    clearButton.dataset.county = 'all';
    clearButton.addEventListener('click', () => filterContactPoints('all'));
    filterBar.appendChild(clearButton);

    for (const countyKey in allData) {
      const county = allData[countyKey];
      const button = document.createElement('button');
      button.textContent = county.fullName;
      button.dataset.county = countyKey;
      button.addEventListener('click', () => filterContactPoints(countyKey));
      filterBar.appendChild(button);
    }
  };

  /**
   * Renders the entire list of contact points from the fetched data.
   * It groups contact points by county.
   */
  const renderContactPoints = () => {
    contactList.innerHTML = '';

    for (const countyKey in allData) {
      const county = allData[countyKey];
      if (county.contactPoints && county.contactPoints.length > 0) {
        const countyName = document.createElement('h3');
        countyName.textContent = county.fullName;
        countyName.dataset.county = countyKey;
        contactList.appendChild(countyName);

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
                link.href = protocol ? `${protocol}${href}` : href;
                if (selector === '.web') {
                  link.textContent = href.replace(/^(https?|ftp):\/\//, '').replace(/^(www\.)?/, '');
                } else {
                  link.textContent = href;
                }
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
          setLink('.web', point.contact.web);

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

          contactList.appendChild(clone);
        });
      }
    }
  };

  /**
   * Fetches the contact point data from the JSON file,
   * then initializes the application by rendering the data and setting up filters.
   */
  fetch('contact-points.json')
    .then(response => response.json())
    .then(data => {
      allData = data;
      renderContactPoints();
      createFilterBar();
      filterContactPoints('all');
    })
    .catch(error => console.error('Error fetching contact points:', error));

  sachsenMapObject.addEventListener('dragstart', (e) => e.preventDefault());

  /**
   * Sets up event listeners for the SVG map once it has loaded.
   * This includes click handlers for counties to trigger filtering.
   */
  sachsenMapObject.addEventListener('load', () => {
    const svgDoc = sachsenMapObject.contentDocument;
    if (!svgDoc) return;

    svgDoc.addEventListener('mousedown', (e) => e.preventDefault());
    svgDoc.addEventListener('dragstart', (e) => e.preventDefault());

    const counties = svgDoc.querySelectorAll('#counties path');
    counties.forEach(county => {
      county.addEventListener('click', (event) => {
        const countyId = event.currentTarget.id;
        if (activeCountyPath && activeCountyPath.id === countyId) {
          filterContactPoints('all');
        } else {
          filterContactPoints(countyId);
        }
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
