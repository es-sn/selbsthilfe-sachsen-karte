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

  const updateHeadlineVisibility = () => {
    const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
    allCountyHeadlines.forEach(headline => {
        const county = headline.dataset.county;
        const pointsForCounty = document.querySelectorAll(`.contact-point[data-county="${county}"]`);
        const isAnyPointVisible = Array.from(pointsForCounty).some(point => !point.classList.contains('hidden'));
        
        headline.classList.toggle('hidden', !isAnyPointVisible);
    });
  };

  const handleLoadMore = () => {
    const hiddenPoints = document.querySelectorAll('.contact-point.hidden');
    
    for (let i = 0; i < 3 && i < hiddenPoints.length; i++) {
      hiddenPoints[i].classList.remove('hidden');
    }

    updateHeadlineVisibility();

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
      allCountyHeadlines.forEach(headline => headline.classList.remove('hidden'));
      
      allContactPoints.forEach((point, index) => {
        point.classList.toggle('hidden', index >= 5);
      });

      updateHeadlineVisibility();

      if (allContactPoints.length > 5) {
        loadMoreButton.style.display = 'block';
      }
    } else {
      allCountyHeadlines.forEach(headline => {
        headline.classList.toggle('hidden', headline.dataset.county !== countyId);
      });
      allContactPoints.forEach(point => {
        point.classList.toggle('hidden', point.dataset.county !== countyId);
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
                const labelNode = link.previousSibling;
                if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
                    labelNode.textContent = '';
                }
                link.style.display = 'none';
              }
            }
          };

          // ID and Name are required.
          setText('.name', point.name);

          // Carrier is optional.
          if (point.carrier) {
            setText('.carrier', point.carrier);
          } else {
            const carrierEl = clone.querySelector('.carrier');
            if (carrierEl) carrierEl.style.display = 'none';
          }

          // Address is optional.
          const addressEl = clone.querySelector('.address');
          if (point.address && addressEl) {
            const parts = [
                point.address.street,
                `${point.address.postalCode || ''} ${point.address.city || ''}`.trim()
            ].filter(Boolean);
            
            if (parts.length > 0) {
                setText('.address', parts.join(', '));
            } else {
                const labelNode = addressEl.previousSibling;
                if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
                    labelNode.textContent = '';
                }
                addressEl.style.display = 'none';
            }
          } else if (addressEl) {
            const labelNode = addressEl.previousSibling;
            if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
                labelNode.textContent = '';
            }
            addressEl.style.display = 'none';
          }

          // Contact links are optional.
          setLink('.phone', point.contact && point.contact.phone, 'tel:');
          setLink('.mobile', point.contact && point.contact.mobile, 'tel:');
          setLink('.email', point.contact && point.contact.email, 'mailto:');

          // Social links are optional.
          const webContainer = clone.querySelector('.social-link-website');
          if (webContainer) {
            if (point.contact && point.contact.web) {
              webContainer.innerHTML = `<a href="${point.contact.web}" target="_blank"><img src="assets/icons/Globe48x28.svg" alt="Website"></a>`;
            } else {
              webContainer.style.display = 'none';
            }
          }

          const facebookContainer = clone.querySelector('.social-link-facebook');
          if (facebookContainer) {
            if (point.social && point.social.facebook) {
              facebookContainer.innerHTML = `<a href="${point.social.facebook}" target="_blank"><img src="assets/icons/Facebook48x28.svg" alt="Facebook"></a>`;
            } else {
              facebookContainer.style.display = 'none';
            }
          }

          const instagramContainer = clone.querySelector('.social-link-instagram');
          if (instagramContainer) {
            if (point.social && point.social.instagram) {
              instagramContainer.innerHTML = `<a href="${point.social.instagram}" target="_blank"><img src="assets/icons/Instagram48x28.svg" alt="Instagram"></a>`;
            } else {
              instagramContainer.style.display = 'none';
            }
          }

          // Copy button functionality
          const copyButton = clone.querySelector('.copy-button');
          if (copyButton) {
            copyButton.addEventListener('click', () => {
              const parts = [];
              parts.push(`Name: ${point.name}`);
              if (point.carrier) parts.push(`Träger: ${point.carrier}`);
              
              if (point.address) {
                const addressParts = [
                    point.address.street,
                    `${point.address.postalCode || ''} ${point.address.city || ''}`.trim()
                ].filter(Boolean);
                if (addressParts.length > 0) {
                    parts.push(`Adresse: ${addressParts.join(', ')}`);
                }
              }

              if (point.contact) {
                if (point.contact.phone) parts.push(`Telefon: ${point.contact.phone}`);
                if (point.contact.mobile) parts.push(`Mobil: ${point.contact.mobile}`);
                if (point.contact.email) parts.push(`Email: ${point.contact.email}`);
                if (point.contact.web) parts.push(`Web: ${point.contact.web}`);
              }

              if (point.social) {
                  if (point.social.facebook) parts.push(`Facebook: ${point.social.facebook}`);
                  if (point.social.instagram) parts.push(`Instagram: ${point.social.instagram}`);
              }

              const textToCopy = parts.join('\n');

              navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = copyButton.querySelector('img');
                if (!icon) return;

                const originalIconSrc = 'assets/icons/Clipboard32x32.svg';
                const checkIconSrc = 'assets/icons/ClipboardCheck32x32.svg';

                icon.src = checkIconSrc;
                copyButton.classList.add('copied');

                setTimeout(() => {
                  icon.src = originalIconSrc;
                  copyButton.classList.remove('copied');
                }, 1000);
              }).catch(err => {
                console.error('Failed to copy text: ', err);
              });
            });
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
